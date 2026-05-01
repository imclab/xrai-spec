#!/usr/bin/env node
/**
 * validate_fixtures.cjs — runs every fixture in examples/ through the XRAI v1.0
 * validator + round-trips via toGraphView. Zero-deps, node-only.
 *
 * Manifesto claims "4/4 fixtures green". Without this runner, that claim drifts
 * whenever someone edits an example. Gate on CI to prevent silent breakage.
 *
 * Usage:  node specs/XXX-zero-to-one/xrai-website/runtimes/_conformance/validate_fixtures.cjs
 * Exit:   0 = all green, 1 = any fixture invalid or graph-view projection breaks
 */
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const WEBSITE = path.resolve(__dirname, '..', '..');
const FIXTURE_DIR = path.join(WEBSITE, 'examples');
const CORE = path.join(WEBSITE, 'js', 'xrai-core.js');

(async () => {
  // ESM module — use dynamic import via file:// URL
  const core = await import(url.pathToFileURL(CORE).href);
  const { validate, toGraphView } = core;

  const fixtures = fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.xrai.json')).sort();
  let pass = 0, fail = 0;
  const failures = [];

  for (const f of fixtures) {
    const full = path.join(FIXTURE_DIR, f);
    try {
      const doc = JSON.parse(fs.readFileSync(full, 'utf8'));
      const v = validate(doc);
      if (!v.valid) {
        fail++;
        failures.push({ file: f, stage: 'validate', errors: v.errors });
        continue;
      }
      const gv = toGraphView(doc);
      if (!Array.isArray(gv.nodes) || !Array.isArray(gv.links)) {
        fail++;
        failures.push({ file: f, stage: 'graphView', errors: ['malformed nodes/links array'] });
        continue;
      }
      // Every entity must project to exactly one graph node.
      const expected = (doc.scene?.entities || []).length;
      if (gv.nodes.length !== expected) {
        fail++;
        failures.push({
          file: f, stage: 'nodeCount',
          errors: [`expected ${expected} nodes, got ${gv.nodes.length}`],
        });
        continue;
      }
      pass++;
      console.log(`✓ ${f}  (${doc.scene?.entities?.length || 0} entities, ${doc.scene?.relations?.length || 0} relations)`);
    } catch (e) {
      fail++;
      failures.push({ file: f, stage: 'parse', errors: [e.message] });
    }
  }

  console.log('');
  console.log(`XRAI conformance: ${pass}/${pass + fail} fixtures green`);

  if (failures.length) {
    console.log('');
    console.log('Failures:');
    for (const fx of failures) {
      console.log(`  ✗ ${fx.file}  [${fx.stage}]`);
      for (const e of fx.errors) console.log(`      ${e}`);
    }
    process.exit(1);
  }
})().catch(e => {
  console.error('validate_fixtures fatal:', e);
  process.exit(2);
});
