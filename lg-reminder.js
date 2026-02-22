// ==UserScript==
// @name         lg-reminder
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  洛谷私信未读消息实时提示
// @author       Gary0
// @match        https://www.luogu.com.cn/*
// @icon         https://cdn.luogu.com.cn/upload/image_hosting/vswisy2e.png
// @supportURL   https://github.com/Gary-0925/lg-reminder/issues
// @grant        none
// @run-at       document-end
// ==/UserScript==

// id 常量
const main_box_id = "lg_reminder", set_btn_id = "lg_reminder_set", set_box_id = "lg_reminder_box";

// 开启 debug 特殊功能
const is_debug = localStorage.getItem("lg_reminder_debug");

class data // 本地储存数据类
{
	constructor(id)
	{
		this.id = id;
		if (localStorage.getItem(this.id) == null) localStorage.setItem(this.id, "{}");
	}
	get_map()
	{
		const data_json = localStorage.getItem(this.id);
		const data_ob = JSON.parse(data_json);
		const data_arr = Object.entries(data_ob);
		const data_map = new Map(data_arr);
		return data_map;
	}
	get_string(key) { return this.get_map().get(key); }
	get(key) { return this.get_string(key.toString()); }
	set_string(key, val)
	{
		var data_map = this.get_map();
		data_map.set(key, val);
		const data_ob = Object.fromEntries(data_map);
		const data_json = JSON.stringify(data_ob);
		localStorage.setItem(this.id, data_json);
	}
	set(key, val) { this.set_string(key.toString(), val); }
}

// 读取本都储存数据
var msg_hsty = new data("lg-reminder-msg-hsty"), tmp_hsty = msg_hsty.get_map();
var uid_list = new data("lg-reminder-uid-list");

function esc_html(str) // 防 xxs
{
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// 元素快捷操作
function get_el(id) { return document.getElementById(id); }
function new_el(id) { return document.createElement(id); }
function insert_el(base, label, content, id, classList)
{
	const el = new_el(label);
	el.innerHTML = content, el.id = id, el.classList = classList;
	return base.appendChild(el);
}
function insert_css(content) { insert_el(get_el(main_box_id), "style", content, "", ""); }
function insert_js(content) { insert_el(get_el(main_box_id), "script", content, "", ""); }

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function send_prompt_chat(uid) // 发送自定义私信
{
	const content = prompt("请输入要回复的消息", "qqnllwb");
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

function load_set_box() // 加载设置面板
{
	const set_box = get_el(set_box_id);
	// 判断应隐藏或显示
	if (set_box.style.display === "none")
	{
		// 显示
		set_box.style.display = "";

		// 遍历特别关注用户列表
		let cnt = 0;
		for (var key of uid_list.get_map().keys())
			if (uid_list.get_string(key) === 1)
			{
				cnt++;

				// 特别关注用户条目
				const uid_box = insert_el(set_box, "div", `<a href="https://www.luogu.com.cn/user/${key}">${key}</a>`, "", "lg_reminder_box");
				uid_box.style = "position: relative; width: 90%; background-color: #45bee68a;";

				if (is_debug)
				{
					// 删除最新消息记录（debug用）
					const clr_btn = insert_el(uid_box, "button", "删除最新消息记录(debug)", "", "lg_reminder_btn");
					clr_btn.style = "position: absolute; right: 150px; top: 0; height: 100%; background-color: #14a1e8c5; margin: 0;";
					clr_btn.addEventListener("click", function(uid){ tmp_hsty.set(uid, 0), msg_hsty.set_string(uid, 0), load_set_box(), load_set_box(); }.bind(null, key));
				}

				// 取消特别关注
				const del_btn = insert_el(uid_box, "button", "取消特别关注", "", "lg_reminder_btn");
				del_btn.style = "position: absolute; right: 0; top: 0; height: 100%; background-color: #e82214c5; margin: 0;";
				del_btn.addEventListener("click", function(uid){ uid_list.set_string(uid, 0), load_set_box(), load_set_box(); }.bind(null, key));
			}

		// 添加特别关注用户
		const add_btn = insert_el(set_box, "button", "添加特别关注用户", "", "lg_reminder_btn");
		add_btn.style = "width: 90%; background-color: #14e84d42;";
		if (cnt < 8) add_btn.addEventListener("click", function(){ uid_list.set_string(prompt('请输入要特别关注的用户uid', 1202669), 1), load_set_box(), load_set_box(); });
		else add_btn.addEventListener("click", function(){ alert("特别关注的人太多啦，有封 ip 风险"), load_set_box(), load_set_box(); });

		// 关闭按钮
		const cls_btn = insert_el(set_box, "button", "×", "", "lg_reminder_btn");
		cls_btn.style = "position: fixed; right: 0; top: 0; color: #e82214af; background-color: #00000000;";
		cls_btn.addEventListener("click", function(){ load_set_box(); });
	}
	else
	{
		// 隐藏
		set_box.style.display = "none", set_box.innerHTML = ``;
	}
}

async function updata_msg() // 新消息监听
{
	for (var key of uid_list.get_map().keys())
		if (uid_list.get(key) === 1)
		{
			console.log("lg_reminder 新消息监听");

			// 获取消息列表
			fetch("https://www.luogu.com.cn/api/chat/record?user=" + key)
			.then((response) => response.json())
			.then((data) =>
			{
				const main_box = get_el(main_box_id);

				// 获取消息列表中最新消息
				const last_message = data.messages.result[data.messages.result.length - 1];

				// 判断是否为新消息
				if ((uid_list.get(last_message.sender.uid) === 1) && (msg_hsty.get(last_message.sender.uid) != last_message.id) && (tmp_hsty.get(last_message.sender.uid.toString()) != last_message.id))
				{
					if (window.location.pathname.includes("chat") && !window.location.pathname.includes("api"))
					{
						// 将消息设置为非新消息
						msg_hsty.set(last_message.sender.uid, last_message.id);
					}
					else
					{
						// 防止消息弹出多次
						tmp_hsty.set(last_message.sender.uid.toString(), last_message.id);

						// 长消息处理
						if (last_message.content.length >= 10)
							last_message.content = esc_html(last_message.content.substr(0, 8)) + `<a href='javascript:alert("${esc_html(last_message.content)}")'>...</a>`;
						else last_message.content = esc_html(last_message.content);
						
						// 新消息弹窗
						const new_msg_box = insert_el(main_box, "div", `${esc_html(last_message.sender.name)} : ${last_message.content}`, "", "lg_reminder_box");
						new_msg_box.style = "width: 90%;";
						new_msg_box.addEventListener("click", function(uid){ setTimeout(() => send_prompt_chat(uid), 100); }.bind(null, last_message.sender.uid));
					}
				}
			})
			.catch((error) => console.error("错误: ", error));
			await sleep(1000);
		}
	setTimeout(() =>
	{
		updata_msg();
	}, 10000);
}

(function()
{
	'use strict';
	setTimeout(() =>
	{
		// 主容器
		const main_box = insert_el(document.body, "div", "", main_box_id, "lg_reminder");
		main_box.style = "position: fixed; top: 100px; right: 0; height: 100%; width: 200px; z-index: 1000; pointer-events: none;";

		// css
		insert_css(`.lg_reminder_box{ overflow: hidden; margin: 5px; padding: 10px; border-radius: 10px; background-color: #f0f5ffdd; pointer-events: auto; }`);
		insert_css(`.lg_reminder_btn{ overflow: hidden; margin: 5px; padding: 10px; border-radius: 10px; background-color: #f0f5ffdd; pointer-events: auto; text-align: center; border: 0; }`);

		// 设置面板
		const set_box = insert_el(main_box, "div", "", set_box_id, "lg_reminder_box");
		set_box.style = "position: fixed; display: none; top: 0; left: 0; height: 100%; width: 100%; padding-top: 50px; margin: 0;";

		// 设置按钮
		const set_btn = insert_el(main_box, "button", "设置", set_btn_id, "lg_reminder_btn");
		set_btn.style = "width: 90%;";
		set_btn.addEventListener("click", function(){ load_set_box(); });

		// 启动监听
		updata_msg();
	}, 500);
})();
