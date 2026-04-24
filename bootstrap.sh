#!/bin/bash
# Creates the full directory structure with empty files

mkdir -p config tools tools/fixtures agent chaos chaos/scenarios routes scripts data data/replays public

# Create empty files
touch config/mongo.js config/atlas.js
touch tools/index.js tools/data-plane.js tools/atlas-admin.js tools/memory.js tools/partner.js
touch agent/orchestrator.js agent/llm.js agent/prompts.js agent/trace.js
touch chaos/index.js chaos/load-generator.js chaos/reset.js
touch chaos/scenarios/working-set-breach.js
touch chaos/scenarios/collscan-avalanche.js
touch chaos/scenarios/replication-lag.js
touch chaos/scenarios/connection-storm.js
touch chaos/scenarios/schema-rot.js
touch routes/diagnose.js routes/chaos.js routes/cluster.js routes/replay.js
touch scripts/setup-cluster.js scripts/seed-incidents.js scripts/seed-load-data.js
touch scripts/create-vector-index.js scripts/record-replay.js scripts/warmup.js
touch data/past_incidents.json data/partner_solutions.json
touch public/index.html public/styles.css public/dashboard.js public/agent-panel.js public/chaos-buffet.js
touch server.js README.md

echo "✅ Project structure created. Now paste content into each file from the artifact."
ls -la