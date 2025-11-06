import { randomUUID } from 'crypto';
import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

import express from 'express';

const app = express();
const port = 3000;
const __dirname = path.resolve();

app.use(express.json());

// 워커별 독립 DB 파일 사용
// HTTP 헤더에서 워커 ID를 읽어 e2e-{index}.json 사용
// 예: Worker 0 -> e2e-0.json, Worker 1 -> e2e-1.json
const getDbName = (req) => {
  if (process.env.TEST_ENV === 'e2e') {
    // HTTP 헤더에서 워커 인덱스 추출
    const workerIndex = req?.headers?.['x-test-worker-index'];
    if (workerIndex !== undefined && workerIndex !== null) {
      return `e2e-${workerIndex}.json`;
    }
    return 'e2e.json'; // 기본값
  }
  return 'realEvents.json';
};

console.log('TEST_ENV:', process.env.TEST_ENV);
console.log('Server starting - will use worker-specific DBs based on X-Test-Worker-Index header');

const getEvents = async (req) => {
  const dbName = getDbName(req);
  const data = await readFile(`${__dirname}/src/__mocks__/response/${dbName}`, 'utf8');
  return JSON.parse(data);
};

const saveEvents = (req, events) => {
  const dbName = getDbName(req);
  fs.writeFileSync(`${__dirname}/src/__mocks__/response/${dbName}`, JSON.stringify({ events }));
};

app.get('/api/events', async (req, res) => {
  const events = await getEvents(req);
  res.json(events);
});

app.post('/api/events', async (req, res) => {
  const events = await getEvents(req);
  const newEvent = { id: randomUUID(), ...req.body };

  saveEvents(req, [...events.events, newEvent]);

  res.status(201).json(newEvent);
});

app.put('/api/events/:id', async (req, res) => {
  const events = await getEvents(req);
  const id = req.params.id;
  const eventIndex = events.events.findIndex((event) => event.id === id);
  if (eventIndex > -1) {
    const newEvents = [...events.events];
    newEvents[eventIndex] = { ...events.events[eventIndex], ...req.body };

    saveEvents(req, newEvents);

    res.json(events.events[eventIndex]);
  } else {
    res.status(404).send('Event not found');
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const events = await getEvents(req);
  const id = req.params.id;

  saveEvents(
    req,
    events.events.filter((event) => event.id !== id)
  );

  res.status(204).send();
});

app.post('/api/events-list', async (req, res) => {
  const events = await getEvents(req);
  const repeatId = randomUUID();
  const newEvents = req.body.events.map((event) => {
    const isRepeatEvent = event.repeat.type !== 'none';
    return {
      id: randomUUID(),
      ...event,
      repeat: {
        ...event.repeat,
        id: isRepeatEvent ? repeatId : undefined,
      },
    };
  });

  saveEvents(req, [...events.events, ...newEvents]);

  res.status(201).json(newEvents);
});

app.put('/api/events-list', async (req, res) => {
  const events = await getEvents(req);
  let isUpdated = false;

  const newEvents = [...events.events];
  req.body.events.forEach((event) => {
    const eventIndex = events.events.findIndex((target) => target.id === event.id);
    if (eventIndex > -1) {
      isUpdated = true;
      newEvents[eventIndex] = { ...events.events[eventIndex], ...event };
    }
  });

  if (isUpdated) {
    saveEvents(req, newEvents);

    res.json(events.events);
  } else {
    res.status(404).send('Event not found');
  }
});

app.delete('/api/events-list', async (req, res) => {
  const events = await getEvents(req);
  const newEvents = events.events.filter((event) => !req.body.eventIds.includes(event.id)); // ? ids를 전달하면 해당 아이디를 기준으로 events에서 제거

  saveEvents(req, newEvents);

  res.status(204).send();
});

app.put('/api/recurring-events/:repeatId', async (req, res) => {
  const events = await getEvents(req);
  const repeatId = req.params.repeatId;
  const updateData = req.body;

  const seriesEvents = events.events.filter((event) => event.repeat.id === repeatId);

  if (seriesEvents.length === 0) {
    return res.status(404).send('Recurring series not found');
  }

  const newEvents = events.events.map((event) => {
    if (event.repeat.id === repeatId) {
      return {
        ...event,
        title: updateData.title || event.title,
        description: updateData.description || event.description,
        location: updateData.location || event.location,
        category: updateData.category || event.category,
        notificationTime: updateData.notificationTime || event.notificationTime,
        repeat: updateData.repeat ? { ...event.repeat, ...updateData.repeat } : event.repeat,
      };
    }
    return event;
  });

  saveEvents(req, newEvents);

  res.json(seriesEvents);
});

app.delete('/api/recurring-events/:repeatId', async (req, res) => {
  const events = await getEvents(req);
  const repeatId = req.params.repeatId;

  const remainingEvents = events.events.filter((event) => event.repeat.id !== repeatId);

  if (remainingEvents.length === events.events.length) {
    return res.status(404).send('Recurring series not found');
  }

  saveEvents(req, remainingEvents);

  res.status(204).send();
});

app.listen(port, () => {
  // 워커별 DB 파일 초기화 (0-9번 워커 지원)
  if (process.env.TEST_ENV === 'e2e') {
    for (let i = 0; i < 10; i++) {
      const dbFile = `e2e-${i}.json`;
      const dbPath = `${__dirname}/src/__mocks__/response/${dbFile}`;
      if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ events: [] }));
        console.log(`Initialized ${dbFile}`);
      }
    }
    // 기본 e2e.json도 생성
    const defaultDbPath = `${__dirname}/src/__mocks__/response/e2e.json`;
    if (!fs.existsSync(defaultDbPath)) {
      fs.writeFileSync(defaultDbPath, JSON.stringify({ events: [] }));
      console.log('Initialized e2e.json');
    }
  }
  console.log(`Server running at http://localhost:${port}`);
});
