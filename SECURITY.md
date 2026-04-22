# Security Policy

## Reporting a vulnerability

Email `security@xrai.dev` with:

- A clear description of the issue
- Steps to reproduce (minimal fixture + runtime version)
- Impact assessment (what a malicious actor could achieve)
- Your GitHub handle if you'd like public credit in the fix commit

**Do NOT open a public issue for security vulnerabilities.** We acknowledge receipt within 72 hours and aim to ship a fix within 14 days for critical issues, 30 days for medium, 90 days for low.

## In scope

- The XRAI normative schema + reference parsers — anything that can cause a runtime to crash, hang, or execute arbitrary code on a malformed document
- The reference Three.js adapter (`runtimes/threejs/`) — XSS, prototype pollution, DoS on malformed input
- The spatial MCP server (`mcp-server/`) — injection, privilege escalation, unauthorized tool invocation
- The rfcs/ process — any mechanism a bad actor could use to poison the spec

## Out of scope

- Third-party runtime implementations (report to their maintainers directly)
- Social-engineering attacks on contributors
- Denial-of-service against xrai.dev itself (infra, not spec)
- Branding / naming disputes (not security)
- Bugs in Portals the app (reference impl lives in a private repo; file issues there)

## Supported versions

Only the current major version of the XRAI spec receives security updates. v1.X: supported. v2.X when released: supported. v0.X drafts: unsupported.

## Disclosure

After a fix ships, we publish a brief post-mortem as a GitHub Discussion or blog post. The reporter gets credited unless they request anonymity. We do not run a bug bounty program.

## Threat model (non-normative)

XRAI documents are data, not code — a conforming runtime MUST NOT execute arbitrary code embedded in an XRAI document. Specifically:

- No `eval()` / `new Function()` on any field
- No loading of remote modules via spec-declared URLs (runtimes may fetch `object.glb.model_url` assets, but the XRAI parser itself is code-free)
- `XRAI_generators` rules (v1.1+) must be evaluated via deterministic generator libraries, never arbitrary code

If you spot a way to bypass this model — especially via parser bugs, deserialization attacks, or schema-injection — **that is exactly the kind of report we want**.

## Contact

- Security issues: `security@xrai.dev`
- General issues: [GitHub Issues](https://github.com/imclab/xra1/issues)
- Process questions: [GitHub Discussions](https://github.com/imclab/xra1/discussions)
