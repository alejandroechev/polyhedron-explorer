import type { Polyhedron } from './polyhedron'
import { findRupertPassage } from './rupert'

self.onmessage = (event: MessageEvent<Polyhedron>) => {
  self.postMessage(findRupertPassage(event.data))
}
