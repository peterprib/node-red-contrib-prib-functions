const fs = require('fs');
const path = require('path');
const logger = new (require('node-red-contrib-logger'))('graphDB');
logger.sendInfo('Graph DB Store Builder');

// Simple in-memory graph database structure
const createGraphStore = () => {
	const nodes = {}; // {id: {id, type, label, properties}}
	const edges = []; // [{source, target, type, properties}]
	const metadata = {}; // Store metadata about documents

	return {
		// Add a node to the graph
		addNode: (id, type, label, properties = {}) => {
			if (!nodes[id]) {
				nodes[id] = {
					id,
					type,
					label,
					properties,
					createdAt: Date.now()
				};
			}
			return nodes[id];
		},

		// Add an edge between nodes
		addEdge: (source, target, type, properties = {}) => {
			edges.push({
				source,
				target,
				type,
				properties,
				createdAt: Date.now()
			});
		},

		// Add document metadata
		addDocumentMetadata: (docId, metadata) => {
			metadata[docId] = metadata;
		},

		// Query nodes by type
		getNodesByType: (type) => {
			return Object.values(nodes).filter(n => n.type === type);
		},

		// Get edges from a node
		getEdgesFrom: (nodeId) => {
			return edges.filter(e => e.source === nodeId);
		},

		// Get edges to a node
		getEdgesTo: (nodeId) => {
			return edges.filter(e => e.target === nodeId);
		},

		// Get all nodes
		getAllNodes: () => Object.values(nodes),

		// Get all edges
		getAllEdges: () => edges,

		// Get graph statistics
		getStats: () => ({
			nodeCount: Object.keys(nodes).length,
			edgeCount: edges.length,
			nodeTypes: Object.values(nodes).reduce((acc, n) => {
				acc[n.type] = (acc[n.type] || 0) + 1;
				return acc;
			}, {}),
			edgeTypes: edges.reduce((acc, e) => {
				acc[e.type] = (acc[e.type] || 0) + 1;
				return acc;
			}, {})
		}),

		// Export to JSON
		toJSON: () => ({
			nodes: Object.values(nodes),
			edges: edges,
			metadata: metadata
		})
	};
};

// Extract text and entities from PDF content
const extractEntitiesFromText = (text) => {
	const entities = {
		terms: [],
		concepts: [],
		people: [],
		organizations: [],
		locations: []
	};

	// Simple term extraction (capitalize words >= 5 chars)
	const words = text.match(/\b[A-Z][a-z]{4,}\b/g) || [];
	entities.terms = [...new Set(words)].slice(0, 20);

	// Extract potential concepts (phrases)
	const phrases = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
	entities.concepts = [...new Set(phrases)].slice(0, 15);

	return entities;
};

// Parse PDF and extract text (simplified - reads as binary)
const extractPDFContent = (filePath) => {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		// Extract readable text (basic approach)
		const text = content
			.replace(/[^\x20-\x7E\n\r]/g, ' ')
			.split('\n')
			.filter(line => line.trim().length > 10)
			.join('\n')
			.slice(0, 5000); // Limit to first 5000 chars
		
		return {
			success: true,
			text: text,
			size: content.length,
			lines: text.split('\n').length
		};
	} catch (err) {
		return {
			success: false,
			error: err.message
		};
	}
};

module.exports = function (RED) {
	function graphDBNode(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.folderPath = config.folderPath || './';
		this.nodeType = config.nodeType || 'document';
		this.createEdges = config.createEdges !== false; // Default true
		this.outputFormat = config.outputFormat || 'json';
		
		// Initialize graph store
		const graphStore = createGraphStore();
		this.graphStore = graphStore;
		
		this.on('input', (msg) => {
			try {
				const folderPath = msg.folderPath || this.folderPath;
				
				if (!folderPath || !fs.existsSync(folderPath)) {
					this.error(`Folder not found: ${folderPath}`);
					msg.error = `Folder not found: ${folderPath}`;
					this.send([null, msg]);
					return;
				}

				// Read all PDF files in folder
				const files = fs.readdirSync(folderPath)
					.filter(f => f.endsWith('.pdf') || f.endsWith('.txt'))
					.slice(0, msg.maxFiles || 100);

				if (files.length === 0) {
					msg.warning = 'No PDF or TXT files found in folder';
					this.send([null, msg]);
					return;
				}

				let processedCount = 0;
				const docNodes = [];
				const allEntities = new Set();

				// Process each file
				files.forEach((file, index) => {
					const filePath = path.join(folderPath, file);
					const fileStats = fs.statSync(filePath);
					
					// Create document node
					const docId = `doc_${index}`;
					const docLabel = file.replace(/\.(pdf|txt)$/, '');
					graphStore.addNode(docId, 'document', docLabel, {
						filename: file,
						size: fileStats.size,
						created: fileStats.birthtime
					});
					docNodes.push(docId);

					// Extract content
					const content = extractPDFContent(filePath);
					if (content.success) {
						processedCount++;
						graphStore.addDocumentMetadata(docId, content);

						// Extract entities
						const entities = extractEntitiesFromText(content.text);
						
						// Add entity nodes and create edges
						if (this.createEdges) {
							// Add term nodes
							entities.terms.forEach((term, ti) => {
								const termId = `term_${term.toLowerCase().replace(/\s+/g, '_')}`;
								graphStore.addNode(termId, 'term', term);
								graphStore.addEdge(docId, termId, 'contains_term', { count: 1 });
								allEntities.add(termId);
							});

							// Add concept nodes
							entities.concepts.forEach((concept, ci) => {
								const conceptId = `concept_${concept.toLowerCase().replace(/\s+/g, '_')}`;
								graphStore.addNode(conceptId, 'concept', concept);
								graphStore.addEdge(docId, conceptId, 'describes_concept', { count: 1 });
								allEntities.add(conceptId);
							});
						}
					}
				});

				// Create relationships between entities if enabled
				if (this.createEdges && allEntities.size > 1) {
					const entities = Array.from(allEntities);
					for (let i = 0; i < Math.min(entities.length, 10); i++) {
						for (let j = i + 1; j < Math.min(entities.length, 10); j++) {
							graphStore.addEdge(entities[i], entities[j], 'related_to');
						}
					}
				}

				// Generate output
				msg.graphData = graphStore.toJSON();
				msg.stats = graphStore.getStats();
				msg.processedFiles = processedCount;
				msg.totalFiles = files.length;
				msg.status = 'success';

				this.status({ fill: 'green', shape: 'dot', text: `${processedCount}/${files.length} files processed` });
				this.send([msg, null]);

			} catch (err) {
				this.error(`Graph DB Error: ${err.message}`);
				msg.error = err.message;
				msg.status = 'error';
				this.status({ fill: 'red', shape: 'ring', text: 'Error: ' + err.message });
				this.send([null, msg]);
			}
		});
	}
	RED.nodes.registerType('graphDB', graphDBNode);
};
