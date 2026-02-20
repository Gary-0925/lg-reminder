// ==UserScript==
// @name         lg-reminder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  洛谷私信未读消息实时提示
// @author       Gary0
// @match        https://www.luogu.com.cn/*
// @icon         https://cdn.luogu.com.cn/upload/image_hosting/vswisy2e.png
// @supportURL   https://github.com/Gary-0925/lg-reminder/issues
// @grant        none
// @run-at       document-end
// ==/UserScript==

const msg_hsty = "lg-reminder-history", uid_list = "lg-reminder-uid";
var local_list, local_hsty = new Map;

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

function get_uid_map()
{
	const uid_json = localStorage.getItem(uid_list);
	const uid_ob = JSON.parse(uid_json);
	const uid_arr = Object.entries(uid_ob);
	var uid_map = new Map(uid_arr);
	return uid_map;
}
function get_uid(uid) { return get_uid_map().get(uid.toString()); }
function set_uid(uid, id)
{
	var nowMap = get_uid_map();
	nowMap.set(uid.toString(), id);
	const uid_ob = Object.fromEntries(nowMap);
	const uid_json = JSON.stringify(uid_ob);
	localStorage.setItem(uid_list, uid_json);
}
function set_uid_string(uid, id)
{
	if (uid === null) return;
	var nowMap = get_uid_map();
	nowMap.set(uid, id);
	const uid_ob = Object.fromEntries(nowMap);
	const uid_json = JSON.stringify(uid_ob);
	localStorage.setItem(uid_list, uid_json);
}

function escape_HTML(str)
{
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const send_chat_js =
`
async function send_chat(uid)
{
	var content = prompt("请输入要回复的消息", "qqnllwb");
	if (content == null) return;
	await fetch("https://www.luogu.com.cn/api/chat/new",
	{
		headers:
		[
			["content-type", "application/json"],
			["referer", "https://www.luogu.com.cn/"],
			["x-csrf-token", document.querySelector("meta[name=csrf-token]").content],
		],
		body: JSON.stringify
		({
			user: uid,
			content: content,
		}),
		method: "POST",
	});
}
`;
function open_set()
{
	const box = document.getElementById("lg_reminder_box");
	if (box.style.display === "none")
	{
		box.style.display = "";

		var map = get_uid_map();
		for (var key of map.keys())
			if (map.get(key) === 1)
			{
				const uid_box = document.createElement("div");
				uid_box.style = "position: relative; margin: 5px; border-radius: 5px; overflow: hidden; width: 90%; padding: 10px; background-color: #45bee68a; border: 0; pointer-events: auto;";
				uid_box.innerHTML = `<a href="https://www.luogu.com.cn/user/${key}">${key}</a>`;

				const del_btn = document.createElement("button");
				del_btn.id = "del_btn_" + key;
				del_btn.style = "position: absolute; right: 0; top: 0; text-align: center; border-radius: 5px; overflow: hidden; height: 100%; padding: 10px; background-color: #e82214c5; border: 0; pointer-events: auto;";
				del_btn.innerHTML = "取消特别关注";
				del_btn.addEventListener('click', function(key){ set_uid_string(key, 0), open_set(), open_set(); }.bind(null, key));
				uid_box.appendChild(del_btn);

				box.appendChild(uid_box);
			}

		const add_btn = document.createElement("div");
		add_btn.style = "position: relative; margin: 5px; border-radius: 5px; overflow: hidden; width: 90%; padding: 10px; background-color: #14e84d42; border: 0; pointer-events: auto;";
		add_btn.innerHTML = "添加特别关注用户";
		add_btn.addEventListener('click', function(){ set_uid_string(prompt('请输入要特别关注的用户uid', 1202669), 1), open_set(), open_set(); });
		box.appendChild(add_btn);

		const cls_btn = document.createElement("button");
		cls_btn.style = "position: fixed; right: 0; top: 0; margin: 5px; border-radius: 5px; overflow: hidden; padding: 10px; color: #e82214af; background-color: #00000000; border: 0; pointer-events: auto;";
		cls_btn.innerHTML = "×";
		cls_btn.addEventListener('click', function(){ open_set(); });
		box.appendChild(cls_btn);
	}
	else box.style.display = "none", box.innerHTML = ``, local_list = get_uid_map();
}

function updata_msg()
{
	console.log(local_list.keys());
	for (var key of local_list.keys())
		if (local_list.get(key) === 1)
		{
			console.log(key);
			fetch("https://www.luogu.com.cn/api/chat/record?user=" + key)
			.then((response) => response.json())
			.then((data) =>
			{
				const msg_box = document.getElementById("lg_reminder");
				const last_message = data.messages.result[data.messages.result.length - 1];
				if (local_list.get(last_message.sender.uid.toString()) === 1 && (get_hsty(last_message.sender.uid) != last_message.id) && (local_hsty.get(last_message.sender.uid.toString()) != last_message.id))
				{
					if (window.location.pathname.includes("chat") && !window.location.pathname.includes("api")) set_hsty(last_message.sender.uid, last_message.id);
					else
					{
						local_hsty.set(last_message.sender.uid.toString(), last_message.id);
						const new_msg_box = document.createElement("div");
						new_msg_box.style = "border-radius: 5px; margin: 5px; overflow: hidden; width: 90%; padding: 10px; background-color: #f0f5ffdd; pointer-events: auto;";
						if (last_message.content.length >= 10)
							last_message.content = escape_HTML(last_message.content.substr(0, 8)) + `<a href='javascript:alert("${escape_HTML(last_message.content)}")'>...</a>`;
						else last_message.content = escape_HTML(last_message.content);
						new_msg_box.innerHTML = `<a href="javascript:send_chat(${last_message.sender.uid})">${escape_HTML(last_message.sender.name)}</a> : ${last_message.content}`;
						msg_box.appendChild(new_msg_box);
					}
				}
			})
			.catch((error) => console.error("错误: ", error));
		}
	setTimeout(() =>
	{
		updata_msg();
	}, 5000);
}

(function()
{
	'use strict';
	if (localStorage.getItem(msg_hsty) == null) localStorage.setItem(msg_hsty, "{}");
	if (localStorage.getItem(uid_list) == null) localStorage.setItem(uid_list, "{}");
	local_hsty = get_hsty_map();
	local_list = get_uid_map();
	setTimeout(() =>
	{
		// 插入主面板 lg_reminder
		const lg_reminder_main = document.createElement("div");
		lg_reminder_main.id = "lg_reminder";
		lg_reminder_main.style = "position: fixed; top: 100px; right: 0; height: 100%; width: 200px; z-index: 1000; pointer-events: none;";
		document.body.appendChild(lg_reminder_main);

		// 插入发送私信脚本
		const send_chat_script = document.createElement("script");
		send_chat_script.innerHTML = send_chat_js;
		lg_reminder_main.appendChild(send_chat_script);

		// 插入设置面板 lg_reminder_box
		const lg_reminder_box = document.createElement("div");
		lg_reminder_box.id = "lg_reminder_box";
		lg_reminder_box.style = "position: fixed; display: none; border-radius: 10px; padding: 10px; top: 0; left: 0; height: 100%; width: 100%; background-color: #f0f5ffdd; pointer-events: auto;";
		lg_reminder_box.innerHTML = "";
		lg_reminder_main.appendChild(lg_reminder_box);

		// 插入设置按钮 lg_reminder_set
		const lg_reminder_set = document.createElement("button");
		lg_reminder_set.id = "lg_reminder_set";
		lg_reminder_set.style = "text-align: center; margin: 5px; border-radius: 5px; overflow: hidden; width: 90%; padding: 10px; background-color: #f0f5ffdd; border: 0; pointer-events: auto;";
		lg_reminder_set.innerHTML = "设置";
		lg_reminder_set.addEventListener('click', function(){ open_set(); });
		lg_reminder_main.appendChild(lg_reminder_set);

		// 启动监听
		updata_msg();
	}, 500);
})();
