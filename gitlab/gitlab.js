const logger = new (require("node-red-contrib-logger"))("GitLab Access");
logger.sendInfo("Copyright 2025 Jaroslav Peter Prib");

const axios = require('axios');

const actions = {
    getRepo: async (RED, node, msg) => {
        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}`;
        const response = await axios.get(url, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            }
        });
        return response.data;
    },

    listIssues: async (RED, node, msg) => {
        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/issues`;
        const params = {};
        if (msg.payload && msg.payload.state) params.state = msg.payload.state;
        if (msg.payload && msg.payload.labels) params.labels = msg.payload.labels;
        if (msg.payload && msg.payload.assignee_id) params.assignee_id = msg.payload.assignee_id;

        const response = await axios.get(url, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            },
            params
        });
        return response.data;
    },

    createIssue: async (RED, node, msg) => {
        if (!msg.payload || !msg.payload.title) {
            throw new Error("msg.payload must contain title for issue creation");
        }

        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/issues`;
        const data = {
            title: msg.payload.title,
            description: msg.payload.description || '',
            labels: msg.payload.labels || [],
            assignee_ids: msg.payload.assignee_ids || []
        };

        const response = await axios.post(url, data, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            }
        });
        return response.data;
    },

    getMergeRequests: async (RED, node, msg) => {
        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/merge_requests`;
        const params = {};
        if (msg.payload && msg.payload.state) params.state = msg.payload.state;
        if (msg.payload && msg.payload.source_branch) params.source_branch = msg.payload.source_branch;
        if (msg.payload && msg.payload.target_branch) params.target_branch = msg.payload.target_branch;

        const response = await axios.get(url, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            },
            params
        });
        return response.data;
    },

    createMergeRequest: async (RED, node, msg) => {
        if (!msg.payload || !msg.payload.title || !msg.payload.source_branch || !msg.payload.target_branch) {
            throw new Error("msg.payload must contain title, source_branch, and target_branch for MR creation");
        }

        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/merge_requests`;
        const data = {
            title: msg.payload.title,
            description: msg.payload.description || '',
            source_branch: msg.payload.source_branch,
            target_branch: msg.payload.target_branch,
            assignee_id: msg.payload.assignee_id,
            labels: msg.payload.labels || []
        };

        const response = await axios.post(url, data, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            }
        });
        return response.data;
    },

    getFile: async (RED, node, msg) => {
        const filePath = msg.payload && msg.payload.file_path ? msg.payload.file_path : node.filePath;
        if (!filePath) {
            throw new Error("file_path must be provided in msg.payload or configured in node");
        }

        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/repository/files/${encodeURIComponent(filePath)}`;
        const params = {};
        if (msg.payload && msg.payload.ref) params.ref = msg.payload.ref;
        else params.ref = 'main';

        const response = await axios.get(url, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            },
            params
        });
        return {
            file_path: response.data.file_path,
            file_name: response.data.file_name,
            size: response.data.size,
            encoding: response.data.encoding,
            content: Buffer.from(response.data.content, response.data.encoding).toString('utf8'),
            ref: response.data.ref,
            blob_id: response.data.blob_id,
            commit_id: response.data.commit_id,
            last_commit_id: response.data.last_commit_id
        };
    },

    runPipeline: async (RED, node, msg) => {
        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/pipeline`;
        const data = {
            ref: msg.payload && msg.payload.ref ? msg.payload.ref : 'main',
            variables: msg.payload && msg.payload.variables ? msg.payload.variables : []
        };

        const response = await axios.post(url, data, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            }
        });
        return response.data;
    },

    createCommit: async (RED, node, msg) => {
        if (!msg.payload || !msg.payload.branch || !msg.payload.commit_message || !msg.payload.actions) {
            throw new Error("msg.payload must contain branch, commit_message, and actions for commit creation");
        }

        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/repository/commits`;
        const data = {
            branch: msg.payload.branch,
            commit_message: msg.payload.commit_message,
            actions: msg.payload.actions,
            author_email: msg.payload.author_email,
            author_name: msg.payload.author_name
        };

        const response = await axios.post(url, data, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            }
        });
        return response.data;
    },

    getCommits: async (RED, node, msg) => {
        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/repository/commits`;
        const params = {};
        if (msg.payload && msg.payload.ref_name) params.ref_name = msg.payload.ref_name;
        if (msg.payload && msg.payload.since) params.since = msg.payload.since;
        if (msg.payload && msg.payload.until) params.until = msg.payload.until;
        if (msg.payload && msg.payload.path) params.path = msg.payload.path;
        if (msg.payload && msg.payload.author) params.author = msg.payload.author;
        params.per_page = msg.payload && msg.payload.per_page ? msg.payload.per_page : 20;

        const response = await axios.get(url, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            },
            params
        });
        return response.data;
    },

    getCommit: async (RED, node, msg) => {
        const commitSha = msg.payload && msg.payload.commit_sha ? msg.payload.commit_sha : '';
        if (!commitSha) {
            throw new Error("commit_sha must be provided in msg.payload");
        }

        const url = `${node.gitlabUrl}/api/v4/projects/${encodeURIComponent(node.projectId)}/repository/commits/${commitSha}`;

        const response = await axios.get(url, {
            headers: {
                'Private-Token': node.accessToken,
                'User-Agent': 'Node-RED-GitLab-Node'
            }
        });
        return response.data;
    }

module.exports = function (RED) {
    function GitLabNode(config) {
        RED.nodes.createNode(this, config);
        const node = Object.assign(this, config, {
            gitlabUrl: config.gitlabUrl || 'https://gitlab.com',
            accessToken: config.accessToken || '',
            projectId: config.projectId || '',
            filePath: config.filePath || ''
        });

        node.callFunction = actions[config.action];
        if (!node.callFunction) {
            node.error("Unknown action: " + config.action);
            node.status({ fill: "red", shape: "ring", text: "Unknown action: " + config.action });
            return;
        }

        if (!node.accessToken) {
            node.error("GitLab access token is required");
            node.status({ fill: "red", shape: "ring", text: "Access token required" });
            return;
        }

        if (!node.projectId) {
            node.error("GitLab project ID is required");
            node.status({ fill: "red", shape: "ring", text: "Project ID required" });
            return;
        }

        node.status({ fill: "green", shape: "dot", text: "Ready" });

        node.on('input', async function (msg) {
            try {
                msg.result = await node.callFunction(RED, node, msg);
                node.send(msg);
                node.status({ fill: "green", shape: "dot", text: "Success" });
            } catch (error) {
                node.error(error.message, msg);
                node.status({ fill: "red", shape: "ring", text: error.message.substring(0, 20) });
            }
        });
    }
    RED.nodes.registerType("gitlab", GitLabNode);
};