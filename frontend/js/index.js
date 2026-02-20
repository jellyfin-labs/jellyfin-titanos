/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Detect Chromium version from user agent.
// Titan OS versions: 2020-2022=Chrome 84, 2023-2024=Chrome 112, 2025-2026=Chromium 122.
var chromeMajor = (function() {
	var match = navigator.userAgent.match(/Chrome\/(\d+)/);
	return match ? parseInt(match[1], 10) : 0;
})();
console.log('Detected Chrome ' + chromeMajor);

var curr_req = false;
var server_info = false;
var manifest = false;
var connected_servers = {};
var discovered_servers = {};

var appInfo = {
	deviceId: null,
	deviceName: 'Titan OS TV',
	appName: 'Jellyfin for Titan OS',
	appVersion: '0.0.0'
};

// Initialize Titan SDK
var titanSDK = null;
var deviceInfo = null;

function initTitanSDK() {
	// The Titan SDK is loaded via script tag in index.html
	// Wait for it to be ready, with a timeout to prevent infinite hangs
	if (typeof getTitanSDK === 'function') {
		titanSDK = getTitanSDK();
		if (titanSDK && titanSDK.isReady) {
			var SDK_TIMEOUT = 10000;
			Promise.race([
				titanSDK.isReady,
				new Promise(function(_, reject) {
					setTimeout(function() { reject(new Error('Titan SDK initialization timed out after ' + SDK_TIMEOUT + 'ms')); }, SDK_TIMEOUT);
				})
			]).then(function() {
				console.log('Titan SDK initialized');
				loadDeviceInfo();
			}).catch(function(err) {
				console.error('Titan SDK initialization failed:', err);
			});
		}
	}
}

function loadDeviceInfo() {
	if (titanSDK && titanSDK.deviceInfo) {
		titanSDK.deviceInfo.getDeviceInfo().then(function(info) {
			deviceInfo = info;
			console.log('Device info loaded:', info);

			// Update appInfo with real device data from SDK
			if (info.Product) {
				appInfo.deviceName = info.Product.platform || appInfo.deviceName;
				appInfo.deviceId = info.Product.deviceID || appInfo.deviceId;
			}
		}).catch(function(err) {
			console.error('Failed to get device info:', err);
		});
	}
}

function isVisible(element) {
	return element.offsetWidth > 0 && element.offsetHeight > 0;
}

function findIndex(array, currentNode) {
	for (var i = 0, item; item = array[i]; i++) {
		if (currentNode.isEqualNode(item))
			return i;
	}
	return -1;
}

function navigate(amount) {
	console.log("Navigating " + amount.toString() + "...");
	var element = document.activeElement;
	if (element === null) {
		navigationInit();
	} else if (!isVisible(element) || element.tagName == 'BODY') {
		navigationInit();
	} else {
		var currentNode = element;
		var allElements = document.querySelectorAll('input, button, a, area, object, select, textarea, [contenteditable]');
		var currentIndex = findIndex(allElements, currentNode);
		if (allElements[currentIndex + amount]) {
			allElements[currentIndex + amount].focus();
		}
	}
}

function upArrowPressed() {
	navigate(-1);
}

function downArrowPressed() {
	navigate(1);
}

function leftArrowPressed() {
	// Your stuff here
}

function rightArrowPressed() {
	// Your stuff here
}

function backPressed() {
	showExitDialog();
}

function showExitDialog() {
	var dialog = document.getElementById('exitDialog');
	if (dialog.style.display !== 'none') return;
	dialog.style.display = '';
	document.getElementById('exitCancel').focus();

	document.getElementById('exitCancel').onclick = function() {
		hideExitDialog();
	};
	document.getElementById('exitConfirm').onclick = function() {
		hideExitDialog();
		exitApp();
	};
}

function hideExitDialog() {
	document.getElementById('exitDialog').style.display = 'none';
	navigationInit();
}

function exitApp() {
	if (titanSDK && titanSDK.appLifecycle) {
		titanSDK.appLifecycle.exit();
	} else {
		window.close();
	}
}

document.onkeydown = function (evt) {
	evt = evt || window.event;

	// If exit dialog is visible, handle its own navigation
	var exitDialog = document.getElementById('exitDialog');
	if (exitDialog && exitDialog.style.display !== 'none') {
		switch (evt.keyCode) {
			case 8: // Back (Philips)
			case 461: // Back (JVC)
			case 27: // Exit
				hideExitDialog();
				break;
			case 13: // OK/Enter — activate focused button
				if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
					document.activeElement.click();
				}
				break;
		}
		return;
	}

	switch (evt.keyCode) {
		case 37:
			leftArrowPressed();
			break;
		case 39:
			rightArrowPressed();
			break;
		case 38:
			upArrowPressed();
			break;
		case 40:
			downArrowPressed();
			break;
		case 8: // Back (Philips)
		case 461: // Back (JVC)
			backPressed();
			break;
		case 27: // Exit (alternative)
			backPressed();
			break;
	}
};

function handleCheckbox(elem, evt) {
	console.log(elem);
	if (evt === true) {
		return true;
	} else {
		evt = evt || window.event;
		if (evt.keyCode == 13 || evt.keyCode == 32) {
			elem.checked = !elem.checked;
		}
	}
	return false;
}

function generateDeviceId() {
	return btoa([navigator.userAgent, new Date().getTime()].join('|')).replace(/=/g, '1');
}

function getDeviceId() {
	var deviceId = storage.get('_deviceId2');
	if (!deviceId) {
		deviceId = generateDeviceId();
		storage.set('_deviceId2', deviceId);
	}
	return deviceId;
}

function navigationInit() {
	if (isVisible(document.querySelector('#connect'))) {
		document.querySelector('#connect').focus();
	} else if (isVisible(document.querySelector('#abort'))) {
		document.querySelector('#abort').focus();
	}
}

function Init() {
	appInfo.deviceId = getDeviceId();

	// Get app version from Titan SDK if available
	if (titanSDK && titanSDK.appInfo) {
		titanSDK.appInfo.getAppInfo().then(function(info) {
			if (info && info.version) {
				appInfo.appVersion = info.version;
			}
		}).catch(function(err) {
			console.error('Failed to get app info:', err);
		});
	}

	navigationInit();

	if (storage.exists('connected_servers')) {
		connected_servers = storage.get('connected_servers');
		var first_server = connected_servers[Object.keys(connected_servers)[0]];
		if (first_server) {
			document.querySelector('#baseurl').value = first_server.baseurl;
			document.querySelector('#auto_connect').checked = first_server.auto_connect;
			if (window.performance && window.performance.navigation.type == window.performance.navigation.TYPE_BACK_FORWARD) {
				console.log('Got here using the browser "Back" or "Forward" button, inhibiting auto connect.');
			} else {
				if (first_server.auto_connect) {
					console.log("Auto connecting...");
					handleServerSelect();
				}
			}
			renderServerList(connected_servers);
		}
	}

	// Initialize Titan SDK
	initTitanSDK();
}

function validURL(str) {
	pattern = /^https?:\/\/\S+$/i;
	return !!pattern.test(str);
}

function normalizeUrl(url) {
	url = url.trimLeft ? url.trimLeft() : url.trimStart();
	if (url.indexOf("http://") != 0 && url.indexOf("https://") != 0) {
		url = "http://" + url;
	}
	var parts = url.split("://");
	for (var i = 1; i < parts.length; i++) {
		var part = parts[i];
		while (true) {
			var newpart = part.replace("//", "/");
			if (newpart.length == part.length) break;
			part = newpart;
		}
		parts[i] = part;
	}
	return parts.join("://");
}

function handleServerSelect() {
	var baseurl = normalizeUrl(document.querySelector('#baseurl').value);
	var auto_connect = document.querySelector('#auto_connect').checked;

	if (validURL(baseurl)) {
		displayConnecting();
		console.log(baseurl, auto_connect);

		if (curr_req) {
			console.log("There is an active request.");
			abort();
		}
		hideError();
		getServerInfo(baseurl, auto_connect);
	} else {
		console.log(baseurl);
		displayError("Please enter a valid URL, it needs a scheme (http:// or https://), a hostname or IP (ex. jellyfin.local or 192.168.0.2) and a port (ex. :8096 or :8920).");
	}
}

function displayError(error) {
	var errorElem = document.querySelector('#error');
	errorElem.style.display = '';
	errorElem.innerHTML = error;
}

function hideError() {
	var errorElem = document.querySelector('#error');
	errorElem.style.display = 'none';
	errorElem.innerHTML = '&nbsp;';
}

function displayConnecting() {
	document.querySelector('#serverInfoForm').style.display = 'none';
	document.querySelector('#busy').style.display = '';
	navigationInit();
}

function hideConnecting() {
	document.querySelector('#serverInfoForm').style.display = '';
	document.querySelector('#busy').style.display = 'none';
	navigationInit();
}

function getServerInfo(baseurl, auto_connect) {
	curr_req = ajax.request(normalizeUrl(baseurl + "/System/Info/Public"), {
		method: "GET",
		success: function (data) {
			handleSuccessServerInfo(data, baseurl, auto_connect);
		},
		error: handleFailure,
		abort: handleAbort,
		timeout: 5000
	});
}

function getManifest(baseurl) {
	curr_req = ajax.request(normalizeUrl(baseurl + "/web/manifest.json"), {
		method: "GET",
		success: function (data) {
			handleSuccessManifest(data, baseurl);
		},
		error: handleFailure,
		abort: handleAbort,
		timeout: 5000
	});
}

function getConnectedServers() {
	connected_servers = storage.get('connected_servers');
	if (!connected_servers) {
		connected_servers = {};
	}
	return connected_servers;
}

function handleSuccessServerInfo(data, baseurl, auto_connect) {
	curr_req = false;

	connected_servers = getConnectedServers();
	for (var server_id in connected_servers) {
		var server = connected_servers[server_id];
		if (server.baseurl == baseurl) {
			if (server.id != data.Id && server.id !== false) {
				hideConnecting();
				displayError("The server ID has changed since the last connection, please check if you are reaching your own server. To connect anyway, click connect again.");
				delete connected_servers[server_id];
				connected_servers[data.Id] = ({ 'baseurl': baseurl, 'auto_connect': false, 'id': false });
				storage.set('connected_servers', connected_servers);
				return false;
			}
		}
	}

	connected_servers = lruStrategy(connected_servers, 4, { 'baseurl': baseurl, 'auto_connect': auto_connect, 'id': data.Id, 'Name': data.ServerName });
	storage.set('connected_servers', connected_servers);
	getManifest(baseurl);
	return true;
}

function lruStrategy(old_items, max_items, new_item) {
	var result = {};
	var id = new_item.id;
	delete old_items[id];
	result[id] = new_item;
	var keys = Object.keys(old_items);
	for (var i = 0; i < max_items - 1; i++) {
		var current_key = keys[i];
		if (current_key) {
			result[current_key] = old_items[current_key];
		}
	}
	return result;
}

function handleSuccessManifest(data, baseurl) {
	curr_req = false;

	for (var server_id in connected_servers) {
		var info = connected_servers[server_id];
		if (info['baseurl'] == baseurl) {
			info['Address'] = info['Address'] || baseurl;
			storage.set('connected_servers', connected_servers);
			console.log("handleSuccessManifest modified server");
			console.log(info);

			handoff(baseurl);
			return;
		}
	}
}

function handleAbort() {
	console.log("Aborted.");
	hideConnecting();
	curr_req = false;
}

function handleFailure(data) {
	console.log("Failure:", data);
	console.log("Could not connect to server...");
	if (data == 'timeout') {
		displayError("The request timed out.");
	} else if (data == 'abort') {
		displayError("The request was aborted.");
	} else if (typeof data === 'string') {
		displayError(data);
	} else if (typeof data === 'number' && data > 0) {
		displayError("Got HTTP error " + data.toString() + " from server, are you connecting to a Jellyfin Server?");
	} else {
		displayError("Unknown error occured, are you connecting to a Jellyfin Server?");
	}

	hideConnecting();
	storage.remove('connected_servers');
	curr_req = false;
}

function abort() {
	if (curr_req) {
		curr_req.abort();
	} else {
		hideConnecting();
	}
	console.log("Aborting...");
}

function handoff(serverUrl) {
	console.log("Handoff: loading local jellyfin-web, server API at:", serverUrl);
	stopDiscovery();
	document.querySelector('.container').style.display = 'none';

	// Store server URL for nativeshell's config.json interceptor.
	// The nativeshell injects this into config.json's "servers" array so jellyfin-web
	// connects to the right Jellyfin server instead of window.location.origin.
	localStorage.setItem('jellyfin_server_url', serverUrl);

	// Also pre-seed jellyfin-web credentials in localStorage.
	// Since parent and iframe are same-origin, they share localStorage.
	var credentials = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{"Servers":[]}');
	var serverExists = credentials.Servers.some(function(s) {
		return s.ManualAddress === serverUrl;
	});
	if (!serverExists) {
		credentials.Servers.unshift({
			ManualAddress: serverUrl,
			LastConnectionMode: 2 // Manual
		});
	}
	localStorage.setItem('jellyfin_credentials', JSON.stringify(credentials));

	var contentFrame = document.querySelector('#contentFrame');
	contentFrame.style.display = '';
	// Load LOCAL jellyfin-web (same-origin, has jellyfin-titanos.js nativeshell injected via package.ts).
	// The nativeshell defines window.NativeShell before jellyfin-web initializes.
	// No runtime injection needed — everything is already in the HTML.
	// app.html is the patched jellyfin-web index at the root (same level as JS/CSS chunks).
	contentFrame.src = 'app.html';
}

window.addEventListener('message', function (msg) {
	msg = msg.data;

	var contentFrame = document.querySelector('#contentFrame');

	switch (msg.type) {
		case 'selectServer':
			startDiscovery();
			document.querySelector('.container').style.display = '';
			hideConnecting();
			contentFrame.style.display = 'none';
			contentFrame.src = '';
			break;
		case 'AppHost.exit':
			showExitDialog();
			break;
		case 'enableFullscreen':
			// Make the iframe element fullscreen from the parent side.
			// NOTE: Titan OS apps already run fullscreen — this may be a no-op. Needs real TV testing.
			if (contentFrame.requestFullscreen) {
				contentFrame.requestFullscreen().catch(function(err) {
					console.warn('Fullscreen request failed:', err);
				});
			}
			break;
		case 'disableFullscreen':
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(function(err) {
					console.warn('Exit fullscreen failed:', err);
				});
			}
			break;
	}
});

function renderServerList() {
	// Server list UI removed — we only use the manual URL input field.
}

function renderSingleServer() {
	// Server list UI removed — we only use the manual URL input field.
}

var servers_verifying = {};

function verifyThenAdd(server) {
	if (servers_verifying[server.Id]) {
		return;
	}
	servers_verifying[server.Id] = server;

	curr_req = ajax.request(normalizeUrl(server.Address + "/System/Info/Public"), {
		method: "GET",
		success: function (data) {
			console.log("success");
			console.log(server);
			console.log(data);

			if (data.ProductName == "Jellyfin Server") {
				server.system_info_public = data;
				if (!discovered_servers[server.Id]) {
					discovered_servers[server.Id] = server;
					renderServerList(discovered_servers);
				}
			}
			servers_verifying[server.Id] = true;
		},
		error: function (data) {
			console.log("error");
			console.log(server);
			console.log(data);
			servers_verifying[server.Id] = false;
		},
		abort: function () {
			console.log("abort");
			console.log(server);
			servers_verifying[server.Id] = false;
		},
		timeout: 5000
	});
}

var discover = null;

function startDiscovery() {
	if (discover) {
		return;
	}
	console.log("Starting server autodiscovery...");
	// For TitanOS, we can use the Titan SDK's network capabilities if available
	// For now, we'll skip automatic server discovery since TitanOS doesn't have
	// the same service discovery mechanism as webOS
	// In a full implementation, you could use mDNS/Bonjour or manual entry
}

function stopDiscovery() {
	if (discover) {
		try {
			discover.cancel();
		} catch (err) {
			console.warn(err);
		}
		discover = null;
	}
}

// Start discovery (even if it's a no-op for now)
startDiscovery();
