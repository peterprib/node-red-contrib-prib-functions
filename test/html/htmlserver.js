import fs from 'fs';
import path from 'path';
import http from 'http';
import url from 'url';
const PORT = 8080;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const __basedir = path.join("../..",__dirname);
const htmlContent = content=>`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>HTML Tester</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; }		
	</style>
</head>
<body>
	<h1>Test Page</h1>
	<p>This page is served by a simple Node.js HTTP server. You can add your EBNF test cases here.</p>
	${content}
<br>
<a href="/shutdown">Shutdown Server</a>
</body>
</html>`;



http.createServer((req, res) => {
	const requestPath = req.url === '/' ? '/' : decodeURIComponent(req.url);
	if(requestPath === '/shutdown') {
		console.log('Shutdown requested');
		process.exit(0);
		return
	}
	if (requestPath === '/') {
		// Serve a list of HTML files in the current directory
		fs.readdir(__dirname, (err, files) => {
			if (err) {
				console.error(err);
				const errorMessage = `<h1>Error</h1><p>Unable to read directory: ${err.message}</p>`;
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end(htmlContent(errorMessage), 'utf-8');
				return;
			}
			const htmlFiles = files.filter(file => file.endsWith('.html'));
			let htmlList = '<h1>Available HTML Files:</h1><ul>';
			htmlFiles.forEach(file => {
				htmlList += `<li><a href="/${file}">${file}</a></li>`;
			});
			htmlList += '</ul>';
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(htmlContent(htmlList), 'utf-8');
		});
	} else {
		const filePath = path.join(__dirname, requestPath);
		const extname = path.extname(filePath);
		let contentType = 'text/html';
		switch (extname) {
			case '.js':
				contentType = 'text/javascript';
				break;
			case '.css':
				contentType = 'text/css';
				break;
		}
		const basefile=fs.existsSync(filePath)?filePath:path.join(__dirname,'../..',requestPath)
		fs.readFile(basefile, (error, content) => {
			if (error) {
				if (error.code == 'ENOENT') {
					console.error(`File not found: ${basefile}`);
					res.writeHead(404, { 'Content-Type': 'text/html' });
					res.end(htmlContent(`<h1>Error</h1><p>File not found: ${requestPath}</p>`), 'utf-8');
				} else if (error.code == 'EISDIR') {
					console.error(`Directory access is forbidden: ${basefile}`);
					res.writeHead(403, { 'Content-Type': 'text/html' });
					res.end(htmlContent(`<h1>Error</h1><p>Directory access is forbidden: ${requestPath}</p>`), 'utf-8');
				}	else {				
					console.error(`Server error: ${error.message}`);
					res.writeHead(500, { 'Content-Type': 'text/html' });
					res.end(htmlContent(`<h1>Error</h1><p>Server error: ${error.message}</p>`), 'utf-8');
	
				}
			} else {
				res.writeHead(200, { 'Content-Type': contentType });
				res.end(content, 'utf-8');
			}
		});
	}
}).listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});
