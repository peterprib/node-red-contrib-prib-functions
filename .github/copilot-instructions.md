# Node-RED Contrib Functions

## Project Overview
This is a Node-RED contrib package providing custom nodes for data analysis, matrix operations, transformations, monitoring, and utilities. Nodes process messages in real-time, supporting statistical metrics, data transformations, and system monitoring.

## Architecture
- **Node Structure**: Each node resides in its own directory containing:
  - `.js`: Backend logic using Node-RED's API (e.g., `dataAnalysis/dataAnalysis.js`)
  - `.html`: Frontend configuration UI with typed inputs (e.g., `dataAnalysis/dataAnalysis.html`)
  - `icons/`: Custom node icons
- **Shared Libraries**: `lib/` holds common utilities like `common.js` (dynamic property evaluation), `objectExtensions.js` (array extensions), and domain-specific modules
- **Data Flow**: Nodes typically input `msg.payload`, output results to multiple ports (primary results, details/stats, outliers)

## Key Patterns
- **Node Registration**: Follow `RED.nodes.registerType('NodeName', function(config) { this.on('input', (msg) => { ... }); })`
- **Configuration Properties**: Use defaults like `dataProperty: {value:"msg.payload"}`, leverage typedInput for dynamic paths
- **Error Handling**: Call `node.error(message)` and update status: `node.status({fill:"red",shape:"ring",text:"shortMsg"})`
- **Logging**: Instantiate `const logger = new (require("node-red-contrib-logger"))("NodeName")`; use `logger.sendInfo()` for debugging
- **Real-time Accumulation**: Store data in `node.dataPoint[key]` objects, recalculate metrics on each input (e.g., running averages, deltas)
- **Dynamic Evaluation**: Use `evalInFunction(node, 'propertyName')` from `lib/common.js` to access msg/flow/global properties safely
- **Outlier Detection**: For realtime nodes, check against mean/median ± N standard deviations, output to third port

## Development Workflow
- **Testing**: Run `npm test` (mocha on `test/dataAnalysisE*.js`); use `node-red-node-test-helper` for node testing
- **Local Development**: `npm run startNodeRed` launches test Node-RED instance with flows in `test/data/`
- **Dependencies**: `npm ci` installs; requires Node >=22.15.0, Node-RED >=4.0.9; external libs like `avsc` (AVRO), `xlsx` (Excel), `fast-xml-parser` (XML)

## Examples
- **Data Analysis**: Accumulates arrays/objects, computes stats (avg, stddev, autocorrelation); realtime mode detects outliers beyond 3σ
- **Transform**: Converts formats (JSON↔CSV↔XLSX↔AVRO) using dedicated libraries; supports path operations and string manipulations
- **Matrix**: Performs linear algebra (inverse, determinant, Gaussian elimination) on 2D arrays

## Deployment
- Automated npm publish on GitHub release via `.github/workflows/npmpublish.yml`
- Set `NODE_AUTH_TOKEN` secret for publishing</content>
<parameter name="filePath">c:\Users\peter\repros\node-red-contrib-prib-functions\.github\copilot-instructions.md