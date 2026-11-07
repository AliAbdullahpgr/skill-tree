# Taste

## Tooling & Architecture

- Prefers offline, local sources over live third-party APIs: build from cloned/vendored content and generate local data files rather than calling external endpoints at build or runtime. Confidence: 0.6

## Workflow

- Expects screenshot/image analysis to be delegated to headless sub-agents (e.g. a headless Claude model reading the PNGs) rather than done only by the main agent — prefers parallel worker agents for visual review work. Confidence: 0.6
