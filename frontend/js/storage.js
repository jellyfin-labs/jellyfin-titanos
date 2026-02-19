/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var storage = {};

(function() {
	'use strict';

	var PREFIX = 'jellyfin_titanos_';

	function getKey(key) {
		return PREFIX + key;
	}

	storage.get = function(key) {
		try {
			var value = localStorage.getItem(getKey(key));
			if (value === null) {
				return null;
			}
			return JSON.parse(value);
		} catch (e) {
			return null;
		}
	};

	storage.set = function(key, value) {
		try {
			localStorage.setItem(getKey(key), JSON.stringify(value));
			return true;
		} catch (e) {
			return false;
		}
	};

	storage.remove = function(key) {
		try {
			localStorage.removeItem(getKey(key));
			return true;
		} catch (e) {
			return false;
		}
	};

	storage.exists = function(key) {
		return localStorage.getItem(getKey(key)) !== null;
	};

	storage.clear = function() {
		try {
			var keys = [];
			for (var i = 0; i < localStorage.length; i++) {
				var key = localStorage.key(i);
				if (key && key.indexOf(PREFIX) === 0) {
					keys.push(key);
				}
			}
			keys.forEach(function(key) {
				localStorage.removeItem(key);
			});
			return true;
		} catch (e) {
			return false;
		}
	};
})();
