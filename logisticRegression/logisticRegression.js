const logger = new (require("node-red-contrib-logger"))("Logistic Regression");
logger.sendInfo("Copyright 2025 Jaroslav Peter Prib");

const LogisticRegression = require('logisticegression');
const actions = {
	fit: (RED, node, msg) => {
		if (!node.modelName) {
			throw new Error("Model name is required for fitting");
		}
		if (!msg.payload || !msg.payload.X || !msg.payload.y) {
			throw new Error("For fit, msg.payload must contain X and y arrays");
		}
		const model = new LogisticRegression({
			learningRate: node.learningRate,
			iterations: node.iterations,
			fitIntercept: node.fitIntercept,
			l2: node.l2,
			tolerance: node.tolerance,
			verbose: node.verbose
		});
		model.fit(msg.payload.X, msg.payload.y);
		node.context().flow.set(node.modelName, model);
		return "Model fitted and stored as: " + node.modelName;
	},
	predict: (RED, node, msg) => {
		if (!node.modelName) {
			throw new Error("Model name is required for prediction");
		}
		const model = node.context().flow.get(node.modelName);
		if (!model) {
			throw new Error("Model '" + node.modelName + "' not found. Please fit the model first.");
		}
		if (!Array.isArray(msg.payload)) {
			throw new Error("For predict, msg.payload must be array of features");
		}
		return model.predict(msg.payload);
	},
	predictProba: (RED, node, msg) => {
		if (!node.modelName) {
			throw new Error("Model name is required for prediction");
		}
		const model = node.context().flow.get(node.modelName);
		if (!model) {
			throw new Error("Model '" + node.modelName + "' not found. Please fit the model first.");
		}
		if (!Array.isArray(msg.payload)) {
			throw new Error("For predictProba, msg.payload must be array of features");
		}
		return model.predictProba(msg.payload);
	}
}

module.exports = function (RED) {
	function LogisticRegressionNode(config) {
		RED.nodes.createNode(this, config);
		const node = Object.assign(this, config,{
			learningRate: 0.1,
			iterations: 2000,
			fitIntercept: true,
			l2: 0.0,
			tolerance: 1e-7,
			verbose: false
		});
		node.callFunction = actions[config.action];
		if (!node.callFunction) {
			node.error("Unknown action: " + config.action);
			node.status({ fill: "red", shape: "ring", text: "Unknown action: " + config.action });
			return;
		}
		node.status({ fill: "yellow", shape: "ring", text: "model not fitted" });
		node.on('input', function (msg) {
			try {
				msg.result = node.callFunction(RED, node, msg);
				node.send(msg);
				node.status({ fill: "green", shape: "dot", text: "Done" });
			} catch (error) {
				node.error(error.message, msg);
				node.status({ fill: "red", shape: "ring", text: error.message });
			}
		});
	}
	RED.nodes.registerType("logisticRegression", LogisticRegressionNode);
};