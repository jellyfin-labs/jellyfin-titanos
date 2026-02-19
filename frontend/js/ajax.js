/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var ajax = {};

(function() {
	'use strict';

	ajax.request = function(url, options) {
		var xhr = new XMLHttpRequest();
		var method = options.method || 'GET';
		var timeout = options.timeout || 0;
		var timer = null;
		var id = Math.random().toString(36).substring(2);

		function onLoad() {
			try {
				clearTimeout(timer);
				if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 0) {
					var response = xhr.responseText;
					try {
						response = JSON.parse(response);
					} catch (e) {
						// Not JSON
					}
					if (options.success) {
						options.success(response);
					}
				} else {
					if (options.error) {
						options.error(xhr.status);
					}
				}
			} catch (e) {
				if (options.error) {
					options.error(e);
				}
			}
		}

		function onError() {
			clearTimeout(timer);
			if (options.error) {
				options.error('error');
			}
		}

		function onAbort() {
			clearTimeout(timer);
			if (options.abort) {
				options.abort();
			}
		}

		function ontimeout() {
			xhr.abort();
			if (options.error) {
				options.error('timeout');
			}
		}

		xhr.open(method, url, true);

		if (options.headers) {
			for (var key in options.headers) {
				xhr.setRequestHeader(key, options.headers[key]);
			}
		}

		xhr.onload = onLoad;
		xhr.onerror = onError;
		xhr.onabort = onAbort;

		if (timeout > 0) {
			timer = setTimeout(function() {
				xhr.abort();
				ontimeout();
			}, timeout);
		}

		if (options.data) {
			if (typeof options.data === 'string') {
				xhr.send(options.data);
			} else {
				var formData = new FormData();
				for (var key in options.data) {
					formData.append(key, options.data[key]);
				}
				xhr.send(formData);
			}
		} else {
			xhr.send();
		}

		return {
			abort: function() {
				xhr.abort();
			}
		};
	};

	ajax.get = function(url, options) {
		options = options || {};
		options.method = 'GET';
		return ajax.request(url, options);
	};

	ajax.post = function(url, data, options) {
		options = options || {};
		options.method = 'POST';
		options.data = data;
		return ajax.request(url, options);
	};
})();
