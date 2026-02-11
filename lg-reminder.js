// ==UserScript==
// @name         lg-reminder
// @namespace    http://tampermonkey.net/
// @version      2026-02-11
// @description  洛谷私信未读消息实时提示
// @author       Gary0
// @match        https://www.luogu.com.cn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// @run-at       document-end
// ==/UserScript==

const msg_hsty = "lg-reminder-history";
var uid_list = [ /*在这里输入你要监听的 uid，以英文逗号分隔，第一次使用可能会冒出来一大堆新消息，进入一次私信页面就可以消除了*/ ], local_hsty = new Map;

function get_hsty_map()
{
	const hsty_json = localStorage.getItem(msg_hsty);
	const hsty_ob = JSON.parse(hsty_json);
	const hsty_arr = Object.entries(hsty_ob);
	var hsty_map = new Map(hsty_arr);
	return hsty_map;
}
function get_hsty(uid) { return get_hsty_map().get(uid.toString()); }
function set_hsty(uid, id)
{
	var nowMap = get_hsty_map();
	nowMap.set(uid.toString(), id);
	const hsty_ob = Object.fromEntries(nowMap);
	const hsty_json = JSON.stringify(hsty_ob);
	localStorage.setItem(msg_hsty, hsty_json);
}

function escapeHTML(str)
{
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function updata_msg()
{
	for (var i = 0; i < uid_list.length; i++)
	{
		fetch("https://www.luogu.com.cn/api/chat/record?user=" + uid_list[i].toString())
		.then((response) => response.json())
		.then((data) =>
		{
			const msg_box = document.getElementById("lg_reminder_msg");
			const last_message = data.messages.result[data.messages.result.length - 1];
			if (uid_list.includes(last_message.sender.uid) && (get_hsty(last_message.sender.uid) != last_message.id) && (local_hsty.get(last_message.sender.uid.toString()) != last_message.id))
			{
				if (window.location.pathname.includes("chat")) set_hsty(last_message.sender.uid, last_message.id);
				local_hsty.set(last_message.sender.uid.toString(), last_message.id);
				console.log(local_hsty);
				const newDiv = document.createElement("div");
				newDiv.style = "border-radius: 5px; margin: 5px; overflow: hidden; width: 90%; padding: 10px; background-color: #f0f5ffdd;";
				newDiv.innerHTML = `<a href="https://www.luogu.com.cn/chat?uid=${last_message.sender.uid}">${escapeHTML(last_message.sender.name)}</a> : ${escapeHTML(last_message.content)}`;
				msg_box.appendChild(newDiv);
			}
		})
		.catch((error) => console.error("错误: ", error));
	}
	setTimeout(() =>
	{
		updata_msg();
	}, 10000);
}

(function()
{
	'use strict';
	if (localStorage.getItem(msg_hsty) == null) localStorage.setItem(msg_hsty, "{}");
	local_hsty = get_hsty_map();
	setTimeout(() => {
		const newDiv = document.createElement("div");
		newDiv.style = "position: fixed; bottom: 0; right: 0; height: 20%; width: 20%;";
		newDiv.id = "lg_reminder_msg";
		document.body.appendChild(newDiv);
		updata_msg();
	}, 1000);
})();
