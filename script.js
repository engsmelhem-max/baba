let recognition;
let finalTranscript = "";
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];

// إعداد التعرف على الصوت
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-SA';

    recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        document.getElementById('transcription').innerText = finalTranscript + interimTranscript;
    };
}

const voiceBtn = document.getElementById('voice-btn');

// عند الضغط على الزر
voiceBtn.addEventListener('mousedown', startRecording);
voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });

// عند الإفلات
voiceBtn.addEventListener('mouseup', stopAndSend);
voiceBtn.addEventListener('touchend', stopAndSend);

function startRecording() {
    finalTranscript = "";
    document.getElementById('transcription').innerText = "";
    document.getElementById('status-text').innerText = "جاري الاستماع... 🎙️";
    recognition.start();
}

function stopAndSend() {
    recognition.stop();
    document.getElementById('status-text').innerText = "تم التسجيل! جاري الإرسال...";
    
    setTimeout(() => {
        sendToFormspree();
    }, 1000);
}

function sendToFormspree() {
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const orderText = document.getElementById('transcription').innerText;

    if (!orderText) {
        alert("لم يتم التقاط صوت، حاولي مرة أخرى");
        return;
    }

    const formData = new FormData();
    formData.append("الهاتف", phone);
    formData.append("العنوان", address);
    formData.append("الطلب", orderText);

    fetch("https://formspree.io/f/mdabpdjw", {
        method: "POST",
        body: formData,
        headers: { 'Accept': 'application/json' }
    }).then(response => {
        if (response.ok) {
            orders.push({ date: new Date().toLocaleString(), text: orderText });
            localStorage.setItem('myOrders', JSON.stringify(orders));
            alert("تم إرسال طلبكِ بنجاح! 🎉");
            document.getElementById('transcription').innerText = "";
            document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        }
    });
}

function goToStep2() {
    if(document.getElementById('phone').value && document.getElementById('address').value) {
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');
    } else {
        alert("لطفاً أكملي البيانات");
    }
}

function showHelp() {
    const help = "🌸 طريقة الاستخدام: <br> اضغطي على الزر الأحمر الكبير باستمرار وتحدثي بطلبك، عند الانتهاء اتركي الزر وسيصلنا طلبك فوراً!";
    openModal(help);
}

function showHistory() {
    let historyHtml = "<h3>طلباتكِ السابقة:</h3>";
    orders.forEach(order => {
        historyHtml += `<p style='border-bottom:1px solid #eee; padding:10px;'>${order.text} <br><small>${order.date}</small></p>`;
    });
    openModal(orders.length > 0 ? historyHtml : "لا توجد طلبات سابقة بعد.");
}

function openModal(content) {
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal').style.display = "block";
}

function closeModal() {
    document.getElementById('modal').style.display = "none";
}