import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const previousDocument = globalThis.document;
try {
  globalThis.document = { body: { nodeType: 1 } };
  const { default: GavelAnimation } = await server.ssrLoadModule('/src/components/common/GavelAnimation.jsx');
  let completions = 0;
  const portal = GavelAnimation({ onComplete: () => completions++ });
  assert.equal(portal.containerInfo, document.body);
  const overlay = portal.children;
  assert.equal(overlay.props['aria-hidden'], 'true');
  const target = {};
  overlay.props.onAnimationEnd({ target: {}, currentTarget: target });
  assert.equal(completions, 0, 'Child animations must not complete the overlay');
  overlay.props.onAnimationEnd({ target, currentTarget: target });
  assert.equal(completions, 1);
  assert.doesNotThrow(() => GavelAnimation({}).children.props.onAnimationEnd({ target, currentTarget: target }));
  console.log('Gavel animation: portal and completion callback OK');
} finally {
  globalThis.document = previousDocument;
  await server.close();
}
