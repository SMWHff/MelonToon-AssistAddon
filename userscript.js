// ==UserScript==
// @name         MelonToon - AssistAddon
// @name:zh-CN   ���Ͽ�ͨ - �������Ų��
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  ֧����ˢ���л��½ڣ���[�ҵ��ղ�]����ʾ��󲥷��½ڡ����ȡ������½ڡ���������
// @author       �����޺�
// @match        https://cn.xgcartoon.com/*
// @match        https://www.xgcartoon.com/*
// @match        https://pframe.xgcartoon.com/player.htm*
// @icon         https://cn.xgcartoon.com/icon/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ������ʷ�б�ļ���
    var historyKey = 'playHistory';

    // ������ʷ�б���Ⱥ�˳��
    var OrderKey = 'orderHistory';

    // ��ǰ���ŵ���Ƶ��Ϣ
    window.G_currentVideo = {
        title: null,
        url: null,
        curTime: null,
        durTime: null
    };

    window.setLocalStorage = GM_setValue;
    window.getLocalStorage = GM_getValue;


    var path = window.location.pathname;
    console.log(path);
    if(path === '/user/bookshelf'){
        userBookshelf();
    }else if(path.split('/')[1] === 'video' || path.split('/')[1] === 'user' ){
        inlineVideoSourceSwitch();
    }else if(path === '/player.htm'){
        pframePlayer();
    }

    // �� GM_getValue ��ȡ������ʷ
    function getPlayHistory(dramaTitle) {
        var history = GM_getValue(historyKey, "{}");
        history = JSON.parse(history);
        if(!history[dramaTitle]){
            history[dramaTitle] = {};
        }
        return history;
    }

    // ��������ʷ���浽 GM_setValue
    function savePlayHistory(dramaTitle, video) {
        var history = getPlayHistory(dramaTitle);
        if(video.title) history[dramaTitle].title = video.title;
        if(video.url) history[dramaTitle].url = video.url;
        if(video.curTime) history[dramaTitle].curTime = video.curTime;
        if(video.durTime) history[dramaTitle].durTime = video.durTime;
        GM_setValue(historyKey, JSON.stringify(history));

        console.log(GM_getValue(historyKey, ''));
    }

    // ����ת��Ϊʱ���ʽ
    function formatTime(seconds) {
        seconds = Math.floor(seconds);

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        const formattedHours = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

        return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
    }

    // ��ʽ��Ϊ�ٷֺ�
    function formatAsPercentage(decimal, minimumFractionDigits = 0, maximumFractionDigits = 0) {
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: minimumFractionDigits,
            maximumFractionDigits: maximumFractionDigits
        });
        return formatter.format(decimal);
    }

    function pframePlayer(){
        // ҳ��ر�ǰ���浱ǰ��Ƶ��������ʷ
        window.addEventListener('beforeunload', function() {
            window.G_currentVideo.curTime = elevideo.currentTime;
            savePlayHistoryTime(window.G_currentVideo);
            GM_setValue(getVid() + '_curTime', elevideo.currentTime);
        });

        // ҳ�洰��ǰ���浱ǰ��Ƶ��������ʷ
        window.addEventListener('unload', function() {
            window.G_currentVideo.curTime = elevideo.currentTime;
            savePlayHistoryTime(window.G_currentVideo);
            GM_setValue(getVid() + '_curTime', elevideo.currentTime);
        });

        var elevideo = document.querySelector("#video_frame");
        elevideo.addEventListener('progress', function (e) {
            // �ͻ���������������
            // console.log('�ͻ��������������ݣ�', elevideo.buffered.end(0));
        });
        elevideo.addEventListener('loadedmetadata', function () { //�ɹ���ȡ��Դ����
            //��Ƶ���ܳ���
            console.log('��Ƶ���ܳ��ȣ�' + elevideo.duration);
            window.G_currentVideo.durTime = elevideo.duration;
            savePlayHistoryTime(window.G_currentVideo);

            // ������ʷ���Ž���
            var curTime = Number(GM_getValue(getVid() + '_curTime', 0));
            elevideo.currentTime = curTime;
            console.log('������ʷ���Ž��ȣ�' + curTime);
            elevideo.play();
        });

        elevideo.addEventListener('play', function () { //���ſ�ʼִ�еĺ���
            console.log("��ʼ����");
        });
        elevideo.addEventListener('playing', function () { //������
            console.log("������");
        });
        elevideo.addEventListener('waiting', function () { //����
            console.log("������");
        });
        elevideo.addEventListener('pause', function () { //��ͣ��ʼִ�еĺ���
            console.log("��ͣ����", elevideo.currentTime);
            GM_setValue(getVid() + '_curTime', elevideo.currentTime);
        });
        elevideo.addEventListener('ended', function () { //����
            console.log("���Ž���");
            GM_setValue(getVid() + '_curTime', 0);
        }, false);

        function getVid(){
            var params = new URLSearchParams(window.location.search);
            return params.get('vid');
        }

        function getDramaTitle(){
            return GM_getValue(getVid());
        }

        function savePlayHistoryTime(video){
            savePlayHistory(getDramaTitle(), video)
        }
    }


    function userBookshelf(){
        var OrderList = JSON.parse(GM_getValue(OrderKey, "[]"));
        var bookshelfList = [];
        var bookshelfItems = document.querySelectorAll("#layout > div.bookshelf.container .bookshelf-item");
        bookshelfItems.forEach(function(book) {
            var bookshelf = book.querySelector("div.bookshelf-item-info > div > a");
            var btns = book.querySelector(".btns");
            var lastChapter = book.querySelector(".last-chapter");
            var btnBase = book.querySelector(".btn-base");
            var btnBase_span = btnBase.querySelector("span");

            // ��ȡ������
            var bookTitle = bookshelf.textContent || bookshelf.innerText;

            // ���������ʱ������
            var index = OrderList.indexOf(bookTitle)
            if(index > -1){
                bookshelfList[index] = book;
            }

            // ��ȡ����URL
            var detailURL = bookshelf.href;
            var newVolume = getDetailUpdate(detailURL, btns);

            // ��ȡ��ʷ���ż�¼
            var history = GM_getValue(historyKey, '{}');
            history = JSON.parse(history);
            var history_book = history[bookTitle];
            if(history_book){
                var chapterTitle = history_book.title;
                var btnBaseURL = history_book.url;
                var seconds = history_book.curTime || 0;
                var duration = history_book.durTime;
                var progress = "";

                // ���㲥�Ž���
                if(duration){
                     progress = "��" + formatAsPercentage(seconds / duration) + "��";
                }

                // �޸���󲥷ű���
                if(chapterTitle){
                    lastChapter.innerHTML = '�ϴο���:  ' + chapterTitle + progress;
                }

                // �޸���󲥷�����
                if(btnBaseURL){
                    btnBase.href = btnBaseURL;
                }
            }
        });

        // ����Ԫ��˳��
        // ���� order Ϊ -1 ����ʹ���ŵ���һλ
        bookshelfList.forEach(function(ele) {
            ele.style.order = -1;
        });
    }


    function getDetailUpdate(URL, btns){
        // ����XHR����
        var xhr = new XMLHttpRequest();
        xhr.open('GET', URL, true);
        xhr.responseType = 'document';

        // XHR������ɺ�Ĵ���
        xhr.onload = function() {
            if (xhr.status === 200) {
                // �жϸ���״̬
                var newStatus = "�������"
                var newStatusEle = xhr.response.querySelector(".detail-sider > div:has(+ .desk-ad) > div:last-child");
                if (newStatusEle) {
                    var newStatusText = newStatusEle.textContent || newStatusEle.innerText;
                    if(newStatusText.search(/^ȫ\d+��,/) === 0){
                        newStatus = "ȫ�����";
                    }
                }

                // ����ɹ�����ȡ���»�Ԫ��
                var newVolumeEle = xhr.response.querySelector(".detail-right__volumes > .row > div:last-child > a");
                if (newVolumeEle) {
                    // ���ص�ǰҳ������»�
                    newVolumeEle.className = '';
                    var newVolume = newVolumeEle.outerHTML;
                    btns.insertAdjacentHTML('afterbegin', `<div class="new-chapter text-truncate" style="color: var(--color-primary); padding: 6px 0;" data-v-2c578c40="">`+ newStatus +`:  ` + newVolume +`</div>`);
                } else {
                    console.log('No volume-title found in the response.');
                }
            } else {
                console.log('Request failed. Returned status of ' + xhr.status);
            }
        };

        // ����XHR����
        xhr.send();
}


    function inlineVideoSourceSwitch(){

        // ��ȡ��ǰ�ľ���
        window.G_dramaTitle = '';
        var breadcrumbItem = document.querySelector("nav > ol > a.breadcrumb-item:nth-child(3)")
        if(breadcrumbItem){
            window.G_dramaTitle = breadcrumbItem.textContent || breadcrumbItem.innerText;
        }

        // ����������vid
        var src = document.querySelector('iframe')?.src;
        var search = src.split('?')[1];
        var params = new URLSearchParams(search);
        var vid = params.get('vid');
        GM_setValue(vid, window.G_dramaTitle);

        // ���²����б�˳��
        var OrderList = JSON.parse(GM_getValue(OrderKey, "[]"));
        OrderList = OrderList.filter(item => item !== window.G_dramaTitle);
        OrderList.push(window.G_dramaTitle);
        GM_setValue(OrderKey, JSON.stringify(OrderList));

        // ���浱ǰҳ����Ƶ��Ϣ
        var aActive = document.querySelector('#video-volumes-items a.active');
        if(aActive){
            // ������������������� active Ԫ��λ��
            var activeParent = aActive.parentElement;
            document.querySelector("#video-volumes-items").scrollTo(0, activeParent.offsetTop - activeParent.offsetHeight);

            // ��ȡa��ǩ��href���Ժ��ı����ݣ����⣩
            var href = aActive.getAttribute('href');
            var aActiveTitle = aActive.querySelector('.title');
            var title = aActiveTitle.textContent || aActiveTitle.innerText;

            // ���µ�ǰ��Ƶ��Ϣ
            window.G_currentVideo = { title: title, url: href };
            savePlayHistory(window.G_dramaTitle, window.G_currentVideo);
        }

        // ��ȡ#video-volumes-itemsԪ���µ�����a��ǩ
        var videoVolumeItems = document.querySelectorAll('#video-volumes-items a');


        // ҳ��ر�ǰ���浱ǰ��Ƶ��������ʷ
        window.addEventListener('beforeunload', function() {
            if (window.G_dramaTitle && window.G_currentVideo.title && window.G_currentVideo.url) {
                savePlayHistory(window.G_dramaTitle, window.G_currentVideo);
            }
        });

        // ҳ�洰��ǰ���浱ǰ��Ƶ��������ʷ
        window.addEventListener('unload', function() {
            if (window.G_dramaTitle && window.G_currentVideo.title && window.G_currentVideo.url) {
                savePlayHistory(window.G_dramaTitle, window.G_currentVideo);
            }
        });

        // Ϊÿ��a��ǩ��ӵ���¼�������
        videoVolumeItems.forEach(function(item) {
            item.addEventListener('click', function(event) {
                // ��ֹa��ǩ��Ĭ�ϵ����Ϊ
                event.preventDefault();

                // �Ƴ�����a��ǩ��active��
                videoVolumeItems.forEach(function(el) {
                    el.classList.remove('active');
                });

                // ����ǰ�����a��ǩ���active��
                item.classList.add('active');

                // ��ȡa��ǩ��href���Ժ��ı����ݣ����⣩
                var href = item.getAttribute('href');
                var item_title = item.querySelector('.title');
                var title = item_title.textContent || item_title.innerText;

                // ���µ�ǰ��Ƶ��Ϣ
                window.G_currentVideo = { title: title, url: href };
                savePlayHistory(window.G_dramaTitle, window.G_currentVideo);

                // ����XHR����
                var xhr = new XMLHttpRequest();
                xhr.open('GET', href, true);
                xhr.responseType = 'document';

                // XHR������ɺ�Ĵ���
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        // ����ɹ�����ȡiframeԪ��
                        var iframeSrc = xhr.response.querySelector('iframe')?.src;
                        if (iframeSrc) {
                            // �ҵ���ǰҳ���iframeԪ��
                            var currentIframe = document.querySelector('iframe');
                            if (currentIframe) {
                                // �滻��ǰҳ��iframe��src����
                                currentIframe.src = iframeSrc;
                            } else {
                                console.log('No iframe found on the current page to replace src.');
                            }
                        } else {
                            console.log('No iframe found in the response.');
                        }
                    } else {
                        console.log('Request failed. Returned status of ' + xhr.status);
                    }
                };

                // ����XHR����
                xhr.send();
            });
        });
    }

})();