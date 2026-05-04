const logger = new (require("node-red-contrib-logger"))("arvoStore");

module.exports = function (RED) {
    // Dynamic import to handle ESM lib/arvo.js in CommonJS environment
    let AvroStore;
    const loadAvro = import('../lib/arvo.js').then(m => {
        AvroStore = m.AvroStore;
    }).catch(err => {
        logger.error("Failed to load AvroStore: " + err.message);
    });

    const actions = {
        add: async (RED, node, msg) => {
            let payload = msg.payload;
            if (Array.isArray(payload)) {
                node.store.addMany(payload);
            } else {
                node.store.add(payload);
            }
            node.status({ fill: "green", shape: "dot", text: `Size: ${node.store.size}` });
            return node.store.size;
        },
        query: async (RED, node, msg) => {
            return node.store.query(msg.payload || {});
        },
        sql: async (RED, node, msg) => {
            const sqlQuery = typeof msg.payload === 'string' ? msg.payload : msg.sql || node.sqlQuery;
            if (!sqlQuery) throw new Error("SQL query missing in msg.payload or msg.sql");
            return await node.store.sql(sqlQuery, { msg, flow: node.context().flow, global: node.context().global });
        },
        records: async (RED, node, msg) => {
            return node.store.records();
        }
    };

    function AvroStoreNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.tableName = config.tableName;
        node.schema = config.schema;
        node.action = config.action || "add";
        node.sqlQuery = config.sqlQuery;
        node.outputProperty = config.outputProperty || "payload";
        
        node.callFunction = actions[node.action];
        if (!node.callFunction) {
            node.error("Unknown action: " + node.action);
            node.status({ fill: "red", shape: "ring", text: "Unknown action" });
            return;
        }

        node.status({ fill: "green", shape: "dot", text: "Ready" });

        // Persistent store reference for this node
        node.store = null;

        node.on("input", async function (msg) {
            try {
                await loadAvro;
                
                // Initialize store if it doesn't exist
                if (!node.store) {
                    if (!node.tableName) throw new Error("Table Name is required");
                    let schemaObj;
                    try {
                        schemaObj = typeof node.schema === 'string' ? JSON.parse(node.schema) : node.schema;
                    } catch (e) {
                        throw new Error("Invalid JSON in schema field");
                    }
                    node.store = new AvroStore(schemaObj, node.tableName);
                }

                const result = await node.callFunction(RED, node, msg);
                
                if (result !== undefined) {
                    RED.util.setMessageProperty(msg, node.outputProperty, result);
                    node.send(msg);
                }
                node.status({ fill: "green", shape: "dot", text: "Success" });
            } catch (err) {
                node.error(err.message, msg);
                node.status({ fill: "red", shape: "ring", text: err.message });
            }
        });
    }

    RED.nodes.registerType("arvoStore", AvroStoreNode);
};