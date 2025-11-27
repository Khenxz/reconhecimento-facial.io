
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/U4gaH2SN3/';

let classifier;
let video;
let flippedVideo;
let label = "Carregando...";
let confidence = 0.0;
let modelReady = false;

function setup() {
  createCanvas(640, 480);
  
  // Cria o vídeo
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Carrega o modelo
  console.log('Iniciando carregamento do modelo...');
  console.log('URL do modelo:', imageModelURL + 'model.json');
  
  // Carrega o modelo - na versão 0.12.2, o callback é opcional
  classifier = ml5.imageClassifier(imageModelURL + 'model.json', modelLoaded);
  
  // Fallback: verifica se o modelo carregou após alguns segundos
  let checkCount = 0;
  let checkInterval = setInterval(function() {
    checkCount++;
    if (modelReady) {
      clearInterval(checkInterval);
      return;
    }
    
    // Tenta verificar se o modelo está pronto de outras formas
    if (classifier) {
      // Na versão 0.12.2, podemos tentar classificar diretamente para ver se funciona
      if (checkCount === 5) { // Após 5 segundos
        console.log('Tentando verificar se modelo está pronto...');
        try {
          // Tenta uma classificação de teste (pode falhar, mas indica se está pronto)
          if (video && video.loadedmetadata) {
            modelLoaded(); // Assume que está pronto e tenta
          }
        } catch (e) {
          console.log('Modelo ainda não está pronto:', e);
        }
      }
    }
    
    if (checkCount >= 10) { // Após 10 tentativas (10 segundos)
      clearInterval(checkInterval);
      console.error('Timeout ao carregar modelo');
      label = "Erro: Timeout ao carregar modelo. Verifique a URL.";
    }
  }, 1000);
}

function modelLoaded() {
  if (modelReady) return; // Já foi chamado
  
  console.log('Modelo carregado com sucesso!');
  modelReady = true;
  label = "Aguardando...";
  
  // Aguarda um pouco para garantir que o vídeo está pronto
  setTimeout(function() {
    if (video && video.loadedmetadata) {
      classifyVideo();
    } else {
      console.log('Aguardando vídeo estar pronto...');
      // Tenta novamente em um loop
      let videoCheck = setInterval(function() {
        if (video && video.loadedmetadata) {
          clearInterval(videoCheck);
          classifyVideo();
        }
      }, 100);
    }
  }, 500);
}

function draw() {
  background(0);
  
  // Desenha o vídeo se estiver disponível
  if (video) {
    try {
      // Se quiser espelhado, usamos push/pop e scale
      push();
      translate(width, 0);
      scale(-1, 1);
      image(video, 0, 0, width, height);
      pop();
    } catch (e) {
      // Vídeo ainda não está pronto
    }
  }

  // Caixa de texto
  fill(0, 0, 0, 180);
  rect(0, height - 50, width, 50);

  // Texto
  fill(255);
  textSize(24);
  textAlign(CENTER);
  
  if (label === "Carregando...") {
    text("Carregando modelo e câmera...", width / 2, height - 20);
  } else if (label.includes("Erro")) {
    text(label, width / 2, height - 20);
    fill(255, 0, 0);
    textSize(16);
    text("Verifique o console do navegador (F12)", width / 2, height - 5);
  } else {
    let conf = nf(confidence * 100, 0, 1);
    text(`${label}: ${conf}%`, width / 2, height - 18);
  }
  
  // Tenta iniciar a classificação se o modelo estiver pronto mas ainda não iniciou
  if (modelReady && classifier && video && !classifyVideo.running) {
    classifyVideo.running = true;
    classifyVideo();
  }
}

function classifyVideo() {
  // Só classifica se o modelo estiver pronto
  if (modelReady && classifier && video) {
    try {
      // Atenção: A versão 0.12.2 do ml5 não precisa de flipImage no classificador
      // se treinamos o modelo com a webcam espelhada no site.
      classifier.classify(video, gotResult);
    } catch (err) {
      console.error('Erro ao classificar:', err);
      label = "Erro na classificação: " + err.message;
      classifyVideo.running = false;
    }
  } else {
    if (!modelReady) {
      console.log('Aguardando modelo...');
    }
    if (!video || !video.loadedmetadata) {
      console.log('Aguardando vídeo...');
    }
  }
}

function gotResult(error, results) {
  if (error) {
    console.error('Erro na classificação:', error);
    label = "Erro: " + error.message;
    // Tenta novamente após um tempo
    setTimeout(classifyVideo, 1000);
    return;
  }
  
  if (results && results.length > 0) {
    label = results[0].label;
    confidence = results[0].confidence;
  }
  
  // Loop de classificação
  classifyVideo();
}
