/*
* Author: Segfault /ALL RIGHTS RESERVED\
* License: GNU GENERAL PUBLIC LICENSE
*/
(async function(){
	const VERSION = '1.1.1';
	const V_PREFIX = ':EE';
	const NAME = 'Rust Skin Generator: Electron Edition';
	const ITEM_BASE = require('./assets/js/data/itembase.json');
	const SKINNABLES = require('./assets/js/data/skinnables.json');
	const SKINNABLES_LENGTH = SKINNABLES.length;
	const ITEM_BASE_LENGTH = ITEM_BASE.length;
	const STEAM_WORKSHOP_URL = 'https://steamcommunity.com/workshop/browse/?appid=252490'
	const STEAM_WORKSHOP_API = 'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/';
	const SLEEP_TIME = 10;
	const SLEEP_MULTI = 1;
	const Request = {
		Get: async (url,data) => await Request.fetch(url, null, (d) => d.text()),
		GetJson: async (url, data) => await Request.fetch(url, null, (d) => d.json()),
		Post: async (url,data) => await Request.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', }, body: queryBuilder(data) }, (d) => d.json()),
		fetch: (url, data, func) => {
			if(data == null || !data.timeout) data = Object.assign({ timeout: 2E4, }, data);
			if(!data.redirect) data = Object.assign({redirect: 'follow'}, data);
			return new Promise((res,rej) => fetch(url, data).then(func).then(res).finally(rej));
		}
	};
	const module = angular.module("app", []);
	const content = document.querySelector('div#content');
	const events = {
		events: {},
		on: function (name, func){
			if(typeof(func) !== 'function') return;
			if(!this.events.hasOwnProperty(name)) this.events[name] = [];
			this.events[name].push(func);
		},
		call: function(name, args) {
			if(!this.events.hasOwnProperty(name)) return;
			if(!Array.isArray(args)) args = [args];
			this.events[name].forEach(x => x.apply(null, args));
		}
	}
	const output_element = document.querySelector('span.output');
	const INSTRUCTIONS = [
		NAME + " is an aid to generate skins for your Rust server!",
		"",
		"On the left you're able to search pages of skins. On the right is your current skin list.",
		"",
		"Clicking skins on the left will add skins to the right for you to then download. Clicking skins on the right will remove skins from your list.",
		"",
		"On the right you can also generate a full list of skins. (Note this process will take a while depending on pages).",
		"",
		"I'm not responsible for any use of Approved skins!",
		"",
		"Questions or comments? Contact Segfault#1658!."
	];
	

	Promise.allSettled = Promise.allSettled || ((promises) => Promise.all(promises.map(p => p.then(v => ({status: 'fulfilled',value: v,})).catch(e => ({ status: 'rejected', reason: e,})))));

	// ELECTRON alert/prompt/confirm FIX
	const baseDialog = document.createElement('div');
	baseDialog.appendChild(document.createElement('div'));
	baseDialog.id = 'asyncDialog';
	function alert(msg){
		return new Promise((res,rej) => {
			const d = baseDialog.cloneNode(true);
			d.classList.add('enabled');
			const h2 = document.createElement('h3');
			h2.innerText = msg.toString();
			const b = document.createElement('button');
			b.style.padding = '10px'
			b.innerText = "Ok";
			b.style.position = 'relative';
			b.style.bottom = '0';
			b.onclick = function(){
				d.remove();
				res();
			}
			d.children[0].appendChild(h2);
			d.children[0].appendChild(b);
			content.appendChild(d);
		});
	}

	function confirm(msg){
		return new Promise((res,rej) => {
			const d = baseDialog.cloneNode(true);
			d.classList.add('enabled');
			const h2 = document.createElement('h3');
			h2.innerText = msg.toString();
			const dd = document.createElement('div');
			const b = document.createElement('button');
			b.style.padding = '10px'
			b.innerText = 'Ok';
			b.onclick = function(){
				d.remove();
				res(true);
			}
			const c = document.createElement('button');
			c.style.padding = '10px'
			c.innerText = 'Cancel';
			c.onclick = function(){
				d.remove();
				rej(false);
			}
			d.children[0].appendChild(h2);
			dd.appendChild(b);
			dd.appendChild(c);
			d.children[0].appendChild(dd);
			content.appendChild(d);
		});
	}

	

	async function prompt(msg){
		return new Promise((res,rej) => {
			const d = baseDialog.cloneNode(true);
			d.classList.add('enabled');
			const h2 = document.createElement('h3');
			h2.innerText = msg.toString();
			const dd = document.createElement('div');
			const i = document.createElement('input');
			i.style.width = '100%';
			function submit(){
				const input = i.value;
				d.remove();
				res(input);
			}
			i.onkeyup = (e) => {
				if((e.keyCode || e.which || e.charCode) == 13) {
					submit();
				}
			};
			const b = document.createElement('button');
			b.innerText = 'Ok';
			b.style.padding = '10px'
			b.onclick = () => submit();
			const c = document.createElement('button');
			c.style.padding = '10px'
			c.innerText = 'Cancel';
			c.onclick = function(){
				d.remove();
				rej(false);
			}
			d.children[0].appendChild(h2);
			d.children[0].appendChild(i);
			dd.appendChild(b);
			dd.appendChild(c);
			d.children[0].appendChild(dd);
			content.appendChild(d);
			i.focus();
		});
	}

	// END OF ELECTRON
   
	function tryIntParse(x){
		try{
			return parseInt(x);
		}catch{
			return x;
		}
	}
   
	module.controller('main', function($scope){ 
		$scope.v_prefix = V_PREFIX;
		$scope.name = NAME;
		$scope.version = VERSION;
	});
   
	module.controller('skins', function($scope, $element){
		$scope.howto = () => alert(INSTRUCTIONS.join("\r\n"));
		$scope.skins = {};
		$scope.appendskin = function(skin, update){
			if(!$scope.skins.hasOwnProperty(skin.short))
				$scope.skins[skin.short] = [];
			for(var i in $scope.skins[skin.short]) {
				if($scope.skins[skin.short][i].id == skin.id)
					return;
			}
			$scope.skins[skin.short].push(skin);
			if(update){
				try{
					$scope.$apply();
				}catch{}
			}
		}
		
		$scope.appendskins = function(skins){
			output("Adding " + skins.length + " skins to list.");
			skins.forEach(x => $scope.appendskin(x, false));
			$scope.$apply()
		}
		
		$scope.remove = function(skin){
			let p = $scope.skins[skin.short].indexOf(skin);
			if(p > -1) {
				$scope.skins[skin.short].splice(p, 1);
				output("<a href='"+skin.url+"' target='_blank'>Skin</a> was removed from list");
				if($scope.skins[skin.short].length == 0){
					delete $scope.skins[skin.short];
				}
			}
		}
		
		$scope.clear = function(){
			$scope.skins = {};
			output("All skins cleared!");
		}
		
		$scope.import = async function(){
			
			let data = await prompt("Paste JSON data below");
			try{
				data = JSON.parse(data);
			}catch{
				output("Failed to parse JSON data", "red");
				return;
			}
			
			output("Importing data..", "orange");
			let skins = {};
			let promises = {};

			if(!Array.isArray(data)) {
				data = (!data.Skins) ? data : data.Skins;
				for(var i in data) {
					if(data[i].Skins) {
						skins[data[i]['Item Shortname']] = data[i].Skins.map(x=>tryIntParse(x));
					}else if(Array.isArray(data[i])) {
						skins[i] = data[i].map(x => tryIntParse(x));
					}
				}
			}else if(Array.isArray(data)){
				for(var i in data) {
					if(data[i].Skins) {
						skins[data[i]['Item Shortname']] = data[i].Skins.map(x => tryIntParse(x));
					}
				}
			}else{
				output('Could not determine inputted data type', 'red')
				return;
			}

			
			let skincount = Object.keys(skins).length;
			let a = 0;
			for(var i in skins) {
				let ii = skins[i].indexOf(0);
				while(ii >= 0) {
					skins[i].splice(ii, 1);
					ii = skins[i].indexOf(0);
				}
				promises[i] = GetPublishedFileDetails(skins[i].length, skins[i]);
				//skins[i] = (await GetPublishedFileDetails(skins[i].length, skins[i])).response.publishedfiledetails;
				output("Importing skins. " + a++ + "/" + skincount + "% done.");
				await sleep(SLEEP_TIME * SLEEP_MULTI);
			}
			a = 0;
			console.log(promises);
			for(var i in skins) {
				output("Processing " + i + ". " + a++ + "/" + skincount + "% done.");
				skins[i] = (await promises[i]).response.publishedfiledetails;
				skins[i] = skins[i].filter((skin) => (skin.hasOwnProperty("publishedfileid") && skin.hasOwnProperty("preview_url"))).map(skin => {
					if(!skin.hasOwnProperty("tags") || !skin.hasOwnProperty("publishedfileid") || !skin.hasOwnProperty("preview_url")) {}
					return {
						short: i,
						name: ITEM_BASE.hasOwnProperty(i) ? ITEM_BASE[i] : ((skins.tags != null && skin.tags.length > 0) ? skin.tags[skin.tags.length - 1].tag : null),
						url: "https://steamcommunity.com/sharedfiles/filedetails/?id="+skin.publishedfileid+"&searchtext=",
						id: skin.publishedfileid,
						artwork: skin.preview_url
					}
				});
				$scope.appendskins(skins[i]);
			}
			output("Skins imported! ", "green");
		}
		
		$scope.download = async function(){
			let downloadForSkinsPlugin = (await prompt('Download for Skins plugin? (Y/N) Default: Y') || "y").toString().toLowerCase()[0] === 'y';
			let data = []
			if(downloadForSkinsPlugin) {
				for(const i in $scope.skins) {
					let base = {};
					base["Item Shortname"] = i;
					base["Skins"] = [0];
					$scope.skins[i].forEach(x => base.Skins.push(x.id));
					data.push(base);
				};
			}else {
				data = {};
				for(const i in $scope.skins) {
					let skins = [];
					$scope.skins[i].forEach(x => skins.push(x.id));
					data[i] = skins;
				}
			}
			if(data.length == 0) {
				await alert("There's no skins to download :(");
				return;
			}
			forceDownload(JSON.stringify(data), (await prompt("file name? ex skins") || "skins"), "application/json");
			setTimeout(() => data = null, 1E4);
		}
		
		$scope.generate = async function(){
			let keepCurrentSkins = (await prompt('Keep current skins in list? (Y/N) Default: Y.') || "y").toString().toLowerCase()[0] === 'y';
			let downloadAllApprovedFirst = (await prompt('Generate approved skins? (Y/N) Default: N.\r\n\r\nBe aware, approved skins should NOT be used on servers!.') || "n").toString().toLowerCase()[0] === 'y';
			let pagesToGenerate = parseInt((await prompt('How pages of skins (non approved) to generate per item (30 per page. 2 = 60 skins per item)? (#) Default: 0') || '0'));
			
			if(pagesToGenerate > 5) {
				await alert("Please note, generating alot of pages for skins will take some time.");
			}
			
			if(!keepCurrentSkins){
				$scope.skins = {};
			}
			
			let promises = [];
			
			if(downloadAllApprovedFirst) {
				output('Generating approved');
				let a = 0;
				
				for(const i in SKINNABLES) {
					promises.push(getPagesOfWorkshopItems(5, SKINNABLES[i], "accepted"));
					output("Generating approved skins. " + a++ + "/" + SKINNABLES_LENGTH + "% done.");
					if(promises.length > 0) {
						await Promise.allSettled(promises).then(p => p.forEach(skins => $scope.appendskins(skins.value)));
						//await sleep(100);
						promises = [];
					}
					//await sleep((SLEEP_TIME * 5) * SLEEP_MULTI);
				}
				//SKINNABLES.forEach(x =>promises.push(getPagesOfWorkshopItems(5, x, "accepted")));
				if(promises.length > 0) {
					output("Processing skins..", "yellow");
					await Promise.allSettled(promises).then(p =>  p.forEach(skins => $scope.appendskins(skins.value)));
				}
			}
			if(pagesToGenerate > 0) {
				output("Processing trending.");
				promises = [];
				let a = 0;
				for(var i in SKINNABLES) {
					promises.push(getPagesOfWorkshopItems(pagesToGenerate, SKINNABLES[i], "trend"))
					output("Generating skins. " + a++ + "/" + SKINNABLES_LENGTH + "% done.");
					if(promises.length >= 5) {
						await Promise.allSettled(promises).then(p => p.forEach(skins => $scope.appendskins(skins.value)))
						promises = [];
					}
					// await sleep((SLEEP_TIME * pagesToGenerate) * SLEEP_MULTI);
				}
				
				if(promises.length > 0) {
					output("Processing skins..", "yellow");
					// SKINNABLES.forEach(x =>promises.push(getPagesOfWorkshopItems(pagesToGenerate, x, "trend")));
					await Promise.allSettled(promises).then(p => p.forEach(skins => $scope.appendskins(skins.value)));
				}
			}
			output("Done generating skins!", "green");
			promises = null;
			$scope.$apply();
		}
		events.on('addskin', function(skin) { $scope.appendskin(skin); })
	});

	module.controller('skinsearch', function($scope, $element) {
		$scope.tags = SKINNABLES.map(x => {return {short: x, name: ITEM_BASE[x]}});
		$scope.acceptedOnly = false;
		$scope.results = [];
		$scope.page = 1;
		$scope.hidenextbtn = true;
		$scope.addskin = (skin) => events.call('addskin', [skin]);
		$scope.search = async function(v, clear, page = 1){
			if(clear) {
				$scope.results = await getWorkshopItems(page, v, $scope.acceptedOnly ? "accepted" : "trend");
				$scope.hidenextbtn = $scope.results.length < 30 ? true : false;
			}else{
				let skins = await getWorkshopItems(page, v, $scope.acceptedOnly ? "accepted" : "trend");
				if(skins.length === 0) $scope.hidenextbtn = true;
				else {
					skins.forEach(x => $scope.results.push(x));
					$scope.hidenextbtn = skins.length < 30 ? true : false;
				}
			}
			$scope.$apply();
		};
		
		$scope.alertOfApproved = async () => {
			if($scope.acceptedOnly)
				await alert('Be aware, approved skins should not be used on servers!');
		};
		$scope.addall = () => $scope.results.forEach(x => $scope.addskin(x));
		$scope.skinsearchtag = $scope.tags[rand($scope.tags.length)].short;
		$scope.search($scope.skinsearchtag, true, 1);
	});

	function sleep(ms) {
		return new Promise((res) => setTimeout(res, ms));
	}

	function output(str, color = null){
		output_element.innerHTML = str;
		if(color != null) output_element.style.color = color;
		else output_element.style.color = "";
	}
	
	function rand() {
		let min = (arguments.length > 1) ? arguments[0] : 0;
		let max = (arguments.length > 1) ? arguments[1] : arguments[0];
		return ~~(Math.random() * (max - min) + min);
	}

	function forceDownload(data, filename,  type) {
		let blob = new Blob([data], {type: type});
		if(window.navigator.msSaveOrOpenBlob) {
			window.navigator.msSaveOrOpenBlob(blob, filename);
			setTimeout(() => {blob = null}, 1E4);
			return;
		}
		let a = document.createElement('a');
		a.href = window.URL.createObjectURL(blob);
		a.download = filename;
		a.style.display = 'none';
		document.body.appendChild(a);
		setTimeout(() => {
			a.click();
			setTimeout(() => {
				window.URL.revokeObjectURL(a.href);
				a.remove();
				blob = null;
				a = null;
			}, 1E4);
		}, 1E3);
	}

	async function getWorkshopItems(page, shortname, sortMethod = "accepts") {
		let wsi = [];
		let parser = new DOMParser();
		let doc = parser.parseFromString(await Request.Get(buildUrl(page, ITEM_BASE[shortname], sortMethod, sortMethod)), 'text/html');
		let nodes = doc.querySelectorAll('div[class=workshopItem]');
		nodes.forEach(x => wsi.push({ 
			short: shortname,
			name: ITEM_BASE[shortname],
			url: x.children[0].href, 
			id: parseInt(x.children[0].getAttribute('data-publishedfileid')), 
			artwork: x.children[0].children[0].children[0].src 
		}));
		nodes = null;
		doc = null;
		parser = null;
		return wsi;
	}

	async function getPagesOfWorkshopItems(pages, shortname, sortMethod = "accepted") {
		var wsi = [];
		pages = (pages <= 0) ? 1 : pages;
		let promises = [];
		for(let i = 1; i < pages + 1; i++) {
			promises.push(getWorkshopItems(i, shortname, sortMethod));
			//(await getWorkshopItems(i, tags, sortMethod)).forEach(x => wsi.push(x));
			// await sleep(5000);
		}
		if(promises.length > 0) await Promise.allSettled(promises).then((res) => res.forEach(p => p.value.forEach(x => wsi.push(x))));
		return wsi;
	}

	async function GetPublishedFileDetails(itemcount = 1, publishedfileids = []) {
		if(!Array.isArray(publishedfileids)) publishedfileids = [publishedfileids];
		return await Request.Post(STEAM_WORKSHOP_API, { itemcount: itemcount, publishedfileids: publishedfileids });
	}
	/*
	 * Page (Workshop page of url to search skins from
	 * tags = (array/string) of "tags" to search within steam.
	 * bsort/asrt is browesort and actualsort result arguments. trend, accepted, torate, mostrecent.
	 */

	function buildUrl(page, tags = [], bsort = "accepted", asort = "accepted") {
		if(!Array.isArray(tags)) tags = [tags];
		let url = STEAM_WORKSHOP_URL;
		url += "&p=" + page.toString();
		url += "&actualsort=" + asort;
		url += "&browsesort=" + bsort;
		url += "&numberpage=30";
		for(var i = 0; i < tags.length; i++)
			url += "&requiredtags["+i+"]=" + tags[i].replace(" ", "+");
		return url;
	}
	
	document.querySelector('div#g2').onclick = function(e) {
		var target = (e.target.children.length > 0) ? e.target.children[0] : e.target;
		if(target.nodeName.toLowerCase() == "img") return;
		while(target.parentNode != null) {
			if(target.parentNode.hasAttribute('id') && target.parentNode.getAttribute('id') === 'collapsable') {
				if(target.parentNode.classList.contains('open')) target.parentNode.classList.remove('open');
				else target.parentNode.classList.add('open');
				break;
			}
			target = target.parentNode;
		}
	}
	
	function queryBuilder(data){
		var query = "";
		for(var key in data) {
			if(Array.isArray(data[key])) {
				for(var i = 0; i < data[key].length; i++) {
					query += "&" + key + "["+i+"]=" + data[key][i];
				}
				continue;
			}
			query += "&" + key + "=" + data[key];
		}
		return query.substr(1);
	}
	
})();