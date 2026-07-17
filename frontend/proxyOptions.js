const common_site_config = require('../../../sites/common_site_config.json');
const { webserver_port } = common_site_config;

export default {
	'^/(app|api|assets|files|private)': {
		target: `http://127.0.0.1:${webserver_port}`,
		ws: true,
		router: function(req) {
			const site_name = req.headers.host.split(':')[0];
			return `http://${site_name}:${webserver_port}`;
		}
	}
};


// proxyOptions.js - Vite dev server proxy configuration
// Proxies API/asset requests to the ERPNext server at http://192.168.101.129

// export default {
// 	'^/(app|api|assets|files|private)': {
// 		target: 'http://192.168.101.129',
// 		ws: true,
// 		changeOrigin: true,
// 		secure: false,
// 		cookieDomainRewrite: {
// 			'*': ''
// 		}
// 	}
// };
