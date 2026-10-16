import test from 'node:test'
import assert from 'node:assert/strict'
import { GestureMachine } from '../src/gesture/gestureMachine.ts'

function feed(machine, pose, from, to, step = 50, point = () => ({ x: 0, y: 0 })) {
  const actions = []
  for (let time = from; time <= to; time += step) {
    const result = machine.update(pose, pose === 'none' ? null : point(time), 0.18, time)
    if (result.action) actions.push({ action: result.action, time })
  }
  return actions
}

test('holding a discrete pose triggers once, including brief uncertain frames', () => {
  const machine = new GestureMachine()
  assert.equal(feed(machine, 'fist', 0, 3000).length, 1)
  feed(machine, 'other', 3050, 3150)
  assert.equal(feed(machine, 'fist', 3200, 5000).length, 0)
})

test('an open palm re-arms the next action without leaving the camera', () => {
  const machine = new GestureMachine()
  assert.equal(feed(machine, 'thumbsUp', 0, 800).length, 1)
  feed(machine, 'open', 850, 1500)
  assert.deepEqual(feed(machine, 'fist', 1550, 2600).map((event) => event.action), ['fist'])
})

test('brief tracking loss preserves the lock; sustained loss releases it', () => {
  const machine = new GestureMachine()
  feed(machine, 'thumbsUp', 0, 800)
  feed(machine, 'none', 850, 950)
  assert.equal(feed(machine, 'thumbsUp', 1000, 1800).length, 0)
  feed(machine, 'none', 1850, 2150)
  assert.equal(feed(machine, 'thumbsUp', 2200, 3000).length, 1)
})

test('pose dwell is timestamp based at both 15 and 60 FPS', () => {
  for (const fps of [15, 60]) {
    const events = feed(new GestureMachine(), 'thumbsUp', 0, 1800, 1000 / fps)
    assert.equal(events.length, 1)
    assert.ok(events[0].time >= 650 && events[0].time < 650 + 1000 / fps + 1)
  }
})

test('swipes remain discrete, then re-arm after a stationary palm', () => {
  const machine = new GestureMachine()
  const first = feed(machine, 'open', 0, 650, 25, (time) => ({ x: time / 650 * 0.7, y: 0 }))
  assert.deepEqual(first.map((event) => event.action), ['right'])
  assert.equal(feed(machine, 'open', 675, 1500, 25, () => ({ x: 0.7, y: 0 })).length, 0)
  const second = feed(machine, 'open', 1525, 2200, 25, (time) => ({ x: 0.7 - (time - 1500) / 650 * 0.7, y: 0 }))
  assert.deepEqual(second.map((event) => event.action), ['left'])
  assert.ok(second[0].time - first[0].time >= 800)
})

test('diagonal movement and small near-threshold jitter do not trigger', () => {
  assert.equal(feed(new GestureMachine(), 'open', 0, 1500, 25,
    (time) => ({ x: time / 1000, y: time / 1000 })).length, 0)
  assert.equal(feed(new GestureMachine(), 'open', 0, 2000, 25,
    (time) => ({ x: Math.sin(time / 80) * 0.035, y: 0 })).length, 0)
})

test('uncertain pose changes reset the hold before committing an action', () => {
  const machine = new GestureMachine()
  assert.equal(feed(machine, 'thumbsUp', 0, 600).length, 0)
  feed(machine, 'other', 625, 650, 25)
  assert.equal(feed(machine, 'thumbsUp', 675, 1250, 25).length, 0)
  assert.equal(feed(machine, 'thumbsUp', 1275, 1400, 25).length, 1)
})
