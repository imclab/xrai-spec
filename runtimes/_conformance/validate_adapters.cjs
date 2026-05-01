#!/usr/bin/env node
/**
 * validate_adapters.cjs — runs the 6 pure XRAI adapters (no network) through
 * synthetic input and validates every output is legal XRAI v1.0 + projects
 * cleanly to the renderer graph-view contract.
 *
 * Why it's worth having:
 *   The web adapters (js/adapters/index.js) are the critical surface that
 *   turns any external data → XRAI. A regression here silently breaks a
 *   whole category of use cases (Wikipedia, GitHub, calendars, specs...).
 *
 *   Six adapters don't need network: webpage (HTML-as-string), calendar,
 *   code-deps, markdown-spec, test-workflow, concept-graph. Those six are
 *   fully testable headless, which is 50% of adapter surface locked
 *   deterministically.
 *
 *   Network-dependent adapters (wikipedia, arxiv, twitter, linkedin,
 *   github-repo, github-commits) are documented but not unit-tested here —
 *   add them to a mocked integration suite later if they start regressing.
 *
 * Run:    node specs/XXX-zero-to-one/xrai-website/runtimes/_conformance/validate_adapters.cjs
 * Exit:   0 = all pass, 1 = any adapter output invalid or empty
 */
const path = require('node:path');
const url = require('node:url');

const WEBSITE = path.resolve(__dirname, '..', '..');
const CORE = path.join(WEBSITE, 'js', 'xrai-core.js');
const ADAPTERS = path.join(WEBSITE, 'js', 'adapters', 'index.js');

const FIXTURES = [
  {
    name: 'webpage',
    input: {
      url: 'https://example.com',
      html: '<html><head><title>Example Page</title></head><body>' +
            '<h1>Headline A</h1><h2>Section 1</h2><h2>Section 2</h2>' +
            '<h3>Subsection</h3></body></html>',
    },
    minEntities: 4,
    expectType: 'object.web-container',
  },
  {
    name: 'calendar',
    input: [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT', 'SUMMARY:Test event', 'DTSTART:20260501T100000Z', 'END:VEVENT',
      'BEGIN:VEVENT', 'SUMMARY:Another event', 'DTSTART:20260502T140000Z', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n'),
    minEntities: 2,
    expectType: 'object.event',
    requiresEvents: true,
  },
  {
    name: 'code-deps',
    input: JSON.stringify({
      name: 'demo',
      dependencies: { react: '^19.0.0', lodash: '^4.17.21' },
      devDependencies: { jest: '^29.0.0' },
    }),
    minEntities: 4,
    expectType: 'object.package',
  },
  {
    name: 'markdown-spec',
    input: '# My Spec\n\n' +
           '## Section A\nSome prose.\n\n' +
           '## Section B\nMore prose.\n\n' +
           '## Section C\nLast.\n',
    minEntities: 4,
    expectType: 'file',
  },
  {
    name: 'test-workflow',
    input: {
      name: 'EPM999',
      steps: [
        { id: 's1', label: 'setup',   status: 'pass' },
        { id: 's2', label: 'exercise', status: 'pass' },
        { id: 's3', label: 'assert',   status: 'fail' },
      ],
    },
    minEntities: 4,
    expectType: 'object.test-suite',
    requiresEvents: true,
  },
  {
    name: 'concept-graph',
    input: {
      concepts: [
        { id: 'a', label: 'Concept A' },
        { id: 'b', label: 'Concept B' },
        { id: 'c', label: 'Concept C' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c', type: 'leads-to' },
      ],
    },
    minEntities: 3,
    minRelations: 2,
    expectType: 'concept',
  },
];

(async () => {
  const core = await import(url.pathToFileURL(CORE).href);
  await import(url.pathToFileURL(ADAPTERS).href);
  const { encode, toGraphView, validate } = core;

  let pass = 0, fail = 0;
  const failures = [];

  for (const fx of FIXTURES) {
    try {
      const doc = await encode(fx.name, fx.input);

      // Gate 1: passes v1.0 validator
      const v = validate(doc);
      if (!v.valid) {
        fail++;
        failures.push({ adapter: fx.name, stage: 'validate', errors: v.errors });
        continue;
      }

      // Gate 2: origin tagged with adapter name
      if (doc.origin.app !== fx.name) {
        fail++;
        failures.push({
          adapter: fx.name, stage: 'origin',
          errors: [`origin.app expected "${fx.name}", got "${doc.origin.app}"`],
        });
        continue;
      }

      // Gate 3: at least minEntities produced
      const ents = doc.scene.entities;
      if (ents.length < fx.minEntities) {
        fail++;
        failures.push({
          adapter: fx.name, stage: 'entityCount',
          errors: [`expected ≥${fx.minEntities} entities, got ${ents.length}`],
        });
        continue;
      }

      // Gate 4: expected root type present
      if (fx.expectType && !ents.some(e => e.type === fx.expectType)) {
        fail++;
        failures.push({
          adapter: fx.name, stage: 'expectedType',
          errors: [`no entity of type "${fx.expectType}" found`],
        });
        continue;
      }

      // Gate 5: relations count (optional)
      if (fx.minRelations != null && doc.scene.relations.length < fx.minRelations) {
        fail++;
        failures.push({
          adapter: fx.name, stage: 'relationCount',
          errors: [`expected ≥${fx.minRelations} relations, got ${doc.scene.relations.length}`],
        });
        continue;
      }

      // Gate 6: events present when adapter is temporal
      if (fx.requiresEvents && doc.scene.events.length === 0) {
        fail++;
        failures.push({
          adapter: fx.name, stage: 'events',
          errors: ['adapter should emit at least one event but scene.events was empty'],
        });
        continue;
      }

      // Gate 7: graph-view projection round-trips to expected node count
      const gv = toGraphView(doc);
      if (gv.nodes.length !== ents.length) {
        fail++;
        failures.push({
          adapter: fx.name, stage: 'graphViewRoundTrip',
          errors: [`${ents.length} entities → ${gv.nodes.length} graph nodes`],
        });
        continue;
      }

      pass++;
      console.log(
        `✓ ${fx.name.padEnd(18)} ${ents.length} entities, ` +
        `${doc.scene.relations.length} relations, ` +
        `${doc.scene.events.length} events`,
      );
    } catch (e) {
      fail++;
      failures.push({ adapter: fx.name, stage: 'encode', errors: [e.message] });
    }
  }

  console.log('');
  console.log(`XRAI adapters: ${pass}/${pass + fail} green`);

  if (failures.length) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  ✗ ${f.adapter}  [${f.stage}]`);
      for (const e of f.errors) console.log(`      ${e}`);
    }
    process.exit(1);
  }
})().catch(e => {
  console.error('validate_adapters fatal:', e);
  process.exit(2);
});
