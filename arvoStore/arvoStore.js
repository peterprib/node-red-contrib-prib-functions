const { create } = require("domain");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = new (require("node-red-contrib-logger"))("arvoStore");
const { AvroStore } = require("../lib/arvo.js");
module.exports = function (RED) {
    const memoryStores = new Map();

    const actions = {
        add: async (RED, node, msg) => {
            let payload = msg.payload;
            
            // Auto-generate schema from first payload if not provided
            if (!node.store && node.autoSchema && payload) {
                try {
                    const schema = AvroStore.inferSchemaFromPayload(payload, node.tableName);
                    node.store = new AvroStore(schema, node.tableName);
                    memoryStores.set(node.tableName, node.store);
                    logger.sendInfo(`Schema auto-generated from payload for table: ${node.tableName}`);
                } catch (err) {
                    throw new Error(`Failed to auto-generate schema: ${err.message}`);
                }
            }
            
            if (!node.store) throw new Error("Store not initialized. Provide schema or enable auto-schema");
            
            if (Array.isArray(payload)) {
                node.store.addMany(payload);
            } else {
                node.store.add(payload);
            }
            if (node.persistOnUpdate && (msg.persistPath || node.persistPath)) {
                const targetPath = msg.persistPath || node.persistPath;
                if (node.persistInterval > 0) {
                    node.schedulePersist(targetPath);
                } else {
                    await node.saveStore(targetPath);
                }
            }
            node.status({ fill: "green", shape: "dot", text: `Size: ${node.store.size}` });
            return node.store.size;
        },
        create: async (RED, node, msg) => {
            let schemaObj;
            try {
                schemaObj = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload; 
            } catch (err) {
                throw new Error("Invalid JSON schema in msg.payload");
            }
            node.store = new AvroStore(schemaObj, node.tableName);
            memoryStores.set(node.tableName, node.store);
            node.status({ fill: "green", shape: "dot", text: "Store created" });
            return { message: "Store created", tableName: node.tableName };
        },
        query: async (RED, node, msg) => {
            return node.store.query(msg.payload || {});
        },
        sql: async (RED, node, msg) => {
            const sqlQuery = typeof msg.payload === 'string' ? msg.payload : msg.sql || node.sqlQuery;
            if (!sqlQuery) throw new Error("SQL query missing in msg.payload or msg.sql");

            // Check if SQL has changed by hashing
            const sqlHash = crypto.createHash('md5').update(sqlQuery).digest('hex');
            if (!node.preparedStatement || node.lastSqlHash !== sqlHash) {
                try {
                    node.preparedStatement = node.store.prepareSql(sqlQuery);
                    node.lastSqlHash = sqlHash;
                    logger.sendInfo(`Prepared new SQL query: ${sqlQuery.substring(0, 50)}...`);
                } catch (err) {
                    node.preparedStatement = null;
                    node.lastSqlHash = null;
                    throw err;
                }
            }

            if (!node.preparedStatement) throw new Error("SQL statement failed to prepare");
            return await node.preparedStatement.exec({ msg, flow: node.context().flow, global: node.context().global });
        },
        prepare: async (RED, node, msg) => {
            const sqlQuery = typeof msg.payload === 'string' ? msg.payload : msg.sql || node.sqlQuery;
            if (!sqlQuery) throw new Error("SQL query missing for prepare action");
            try {
                const stmt = node.store.prepareSql(sqlQuery);
                node.preparedStatement = stmt;
            } catch (err) {
                node.preparedStatement = null;
                throw err; // Re-throw to be caught by the main input handler
            }
            node.status({ fill: "green", shape: "dot", text: "SQL prepared" });
            return { message: "SQL statement prepared", stmtId: node.id };
        },
        exec: async (RED, node, msg) => {
            if (!node.preparedStatement) throw new Error("No prepared statement. Call 'prepare' action first");
            const parameters = msg.parameters || { msg, flow: node.context().flow, global: node.context().global };
            return await node.preparedStatement.exec(parameters);
        },
        save: async (RED, node, msg) => {
            const filePath = msg.persistPath || node.persistPath;
            if (!filePath) throw new Error("Persist file path is required for save action");
            return await node.saveStore(filePath);
        },
        size: async (RED, node, msg) => {
            return node.store.size;
        },
        serialize: async (RED, node, msg) => {
            return await node.store.serialize();
        },
        records: async (RED, node, msg) => {
            return node.store.records();
        },
        "via Message": async (RED, node, msg) => {
            const action = msg.operation || node.action;
            const callFunction = actions[action];
            if (!callFunction) throw new Error("Unknown action: " + action);
            return await callFunction(RED, node, msg);
        }
    };

    function AvroStoreNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.tableName = config.tableName;
        node.schema = config.schema;
        node.autoSchema = config.autoSchema === true || config.autoSchema === 'true';
        node.action = config.action || "add";
        node.sqlQuery = config.sqlQuery;
        node.outputProperty = config.outputProperty || "payload";
        node.persistPath = config.persistPath || "";
        node.persistOnUpdate = config.persistOnUpdate === true || config.persistOnUpdate === 'true';
        node.persistInterval = Number(config.persistInterval) || 0;
        node.persistTimer = null;
        node.persistInfo = null;
        node.preparedStatement = null;
        node.lastSqlHash = null;
        
        if (!actions[node.action]) {
            node.error("Unknown action: " + node.action);
            node.status({ fill: "red", shape: "ring", text: "Unknown action" });
            return;
        }

        node.saveStore = async function(filePath) {
            if (!node.store) return
            const buffer = await node.store.serialize();
            const directory = path.dirname(filePath);
            if (directory) {
                await fs.promises.mkdir(directory, { recursive: true });
            }
            await fs.promises.writeFile(filePath, buffer);
            node.persistInfo = {
                path: filePath,
                savedAt: new Date().toISOString(),
                source: 'save'
            };
            node.status({ fill: "blue", shape: "dot", text: `Persisted ${path.basename(filePath)}` });
            return node.persistInfo;
        };

        node.schedulePersist = function(filePath) {
            if (node.persistTimer) {
                clearTimeout(node.persistTimer);
            }
            node.persistTimer = setTimeout(async () => {
                node.persistTimer = null;
                try {
                    const info = await node.saveStore(filePath);
                    node.persistInfo = { ...info, source: 'auto' };
                } catch (err) {
                    node.error("Persist failed: " + err.message);
                }
            }, node.persistInterval || 1);
        };

        node.flushPersist = async function() {
            if (!node.persistTimer) return;
            clearTimeout(node.persistTimer);
            node.persistTimer = null;
            if (node.persistPath) {
                await node.saveStore(node.persistPath);
            }
        };
        try {
            node.callFunction = actions[node.action];
            if (!node.callFunction) throw new Error("Unknown action: " + node.action);

            if (node.persistOnUpdate && node.persistInterval > 0 && node.persistPath) {
                node.schedulePersist(node.persistPath);
            }
 
            if (!node.tableName) throw new Error("Table Name is required");
            
            // Only initialize store if schema is provided and not auto-schema mode
            if (!node.autoSchema && node.schema) {
                let schemaObj;
                try {
                    schemaObj = typeof node.schema === 'string' ? JSON.parse(node.schema) : node.schema;
                    if(schemaObj && typeof schemaObj === 'object' && !schemaObj.name) {
                        schemaObj.name = node.tableName;
                    }
                    node.store = new AvroStore(schemaObj, node.tableName);
                } catch (ex) {
                    throw new Error("Invalid JSON in schema field "+ex.message);
                }
            }
        } catch (ex) {   
            node.error( ex.message);
            node.status({ fill: "red", shape: "square", text: ex.message });
            return
        }

        // Auto-prepare configured SQL query for performance
        let configError = false;
        if (node.store && node.sqlQuery && node.sqlQuery.trim()) {
            try {
                node.preparedStatement = node.store.prepareSql(node.sqlQuery);
                node.lastSqlHash = crypto.createHash('md5').update(node.sqlQuery).digest('hex');
                logger.sendInfo(`Auto-prepared configured SQL query for table: ${node.tableName}`);
            } catch (err) {
                configError = true;
                node.error(`Failed to prepare configured SQL query: ${err.message}`);
                node.status({ fill: "red", shape: "ring", text: `SQL Error: ${err.message}` });
                node.warn(`Failed to prepare configured SQL query: ${err.message}`);
            }
        }
        if (!configError && !node.stateBad) {
            node.status({ fill: "green", shape: "dot", text: "Ready" });
        }

        node.on("input", async (msg) => {
            try {
                if (!node.store && !node.autoSchema) {
                    throw new Error("Store not initialized"); 
                }
                const result = await node.callFunction(RED, node, msg);
                
                if (result !== undefined) {
                    RED.util.setMessageProperty(msg, node.outputProperty, result);
                    node.send(msg);
                }
                if(node.stateBad) {
                    node.stateBad=false;
                    node.status({ fill: "green", shape: "dot", text: "Success" });
                }
            } catch (ex) {
                node.stateBad=true;
                node.error(ex.message, msg);
                logger.sendErrorAndStackDump(`Error in arvoStore node: ${ex.message}`,ex);
                node.status({ fill: "red", shape: "ring", text: ex.message });
            }
        });

        node.on('close', async function(done) {
            if (node.persistTimer) {
                try {
                    await node.flushPersist();
                } catch (err) {
                    node.error("Persist flush failed: " + err.message);
                }
            }
            // Clean up from memory stores
            memoryStores.delete(node.tableName);
            done();
        });
    }

    RED.nodes.registerType("arvoStore", AvroStoreNode);
};