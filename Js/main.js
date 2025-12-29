async function validar(){
    const fields = [
        {id: 'pasajero', msgId: 'validar_pasajero', required: true},
        {id: 'dni', msgId: 'validar_dni', required: true, numeric: true},
        {id: 'telefono', msgId: 'validar_telefono', required: true},
        {id: 'email', msgId: 'validar_email', required: true, minLen: 5},
        {id: 'empresa', msgId: 'validar_empresa'},
        {id: 'servicio', msgId: 'validar_servicio'},
        {id: 'fechaDeViaje', msgId: 'validar_fechaDeViaje'},
        {id: 'fechaRegreso', msgId: 'validar_fechaRegreso'},
        {id: 'origen', msgId: 'validar_origen'},
        {id: 'destino', msgId: 'validar_destino'},
        {id: 'asiento', msgId: 'validar_asiento'},
        {id: 'sena', msgId: 'validar_seña'},
        {id: 'importe', msgId: 'validar_importe'}
    ];

    let error = false;
    // Clear messages
    fields.forEach(f => {
        const elMsg = document.getElementById(f.msgId);
        if(elMsg) elMsg.innerHTML = '';
    });

    for(const f of fields){
        const el = document.getElementById(f.id);
        if(!el) continue;
        const val = el.value.trim();
        if(f.required && !val){
            const msg = document.getElementById(f.msgId);
            if(msg) msg.innerHTML = 'Campo obligatorio';
            if(!error) el.focus();
            error = true;
            continue;
        }
        if(f.numeric && val && !/^\d+$/.test(val)){
            const msg = document.getElementById(f.msgId);
            if(msg) msg.innerHTML = 'Ingrese solo números';
            if(!error) el.focus();
            error = true;
            continue;
        }
        if(f.minLen && val.length < f.minLen){
            const msg = document.getElementById(f.msgId);
            if(msg) msg.innerHTML = 'Valor demasiado corto';
            if(!error) el.focus();
            error = true;
            continue;
        }
    }

    return !error;
}

// Genera un PDF estático (sin campos rellenables) usando pdf-lib y los valores actuales del formulario
async function generarPDF(){
    const ok = await validar();
    if(!ok) return; // no generar si hay errores

    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const startX = 40;
    // Dibujar header: logo, título, matrícula, cuit y fecha de venta
    // Subo un poco el punto de inicio para que el logo quede más arriba
    let y = 820;
    try{
        const imgUrl = 'imagen/image.png';
        const imgBytes = await fetch(imgUrl).then(r => r.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(imgBytes);
        // Aumento el escalado para que el logo se vea más grande
        const pngDims = pngImage.scale(0.6);
        page.drawImage(pngImage, { x: startX, y: y - pngDims.height, width: pngDims.width, height: pngDims.height });
    }catch(e){
        // Si no se puede cargar la imagen, continuar sin ella
        console.warn('No se pudo cargar el logo para el PDF:', e);
    }

    // Título y datos de la empresa
    const registro = (document.getElementById('registro') ? document.getElementById('registro').textContent : '');
    const cuit = (document.getElementById('cuit') ? document.getElementById('cuit').textContent : '');
    const fechaVenta = (document.getElementById('fechaVenta') ? document.getElementById('fechaVenta').value : '');

    page.drawText('DG TURISMO', { x: startX + 160, y: y, size: 20, font });
    page.drawText('Matricula Habilitante Nro: ' + registro, { x: startX + 160, y: y - 22, size: 10, font });
    page.drawText('Cuit: ' + cuit, { x: startX + 160, y: y - 36, size: 10, font });
    if(fechaVenta) page.drawText('Fecha de Venta: ' + fechaVenta, { x: startX + 160, y: y - 50, size: 10, font });

    // Ajustar y para empezar debajo del header
    y = y - 90;
    const lineHeight = 24;

    // Helper para dibujar etiqueta y valor (texto estático)
    function addFieldStatic(label, value, width=400){
        const padding = 6;
        const fontSize = 11;
        const minBoxH = 18;
        const boxX = startX + 140; // posición del rectángulo
        const maxWidth = width - padding * 2;

        // Preparar líneas para ajustar dentro del rectángulo
        const words = String(value || '').split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        for (let i = 0; i < words.length; i++){
            const testLine = line ? line + ' ' + words[i] : words[i];
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth > maxWidth){
                if (line) lines.push(line);
                line = words[i];
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);

        const boxH = Math.max(minBoxH, lines.length * (fontSize + 3) + padding * 2);
        // Calcular Y del rectángulo basado en y actual
        const boxY = y - (boxH / 2);

        // Alinear la etiqueta verticalmente con el rectángulo
        const labelY = boxY + boxH / 2 - (fontSize / 2);
        page.drawText(label, { x: startX, y: labelY, size: 12, font });

        // Dibujar rectángulo contenedor
        page.drawRectangle({ x: boxX, y: boxY, width: width, height: boxH, borderColor: rgb(0,0,0), borderWidth: 1 });

        // Escribir líneas dentro del rectángulo con padding
        let curY = boxY + boxH - padding - fontSize;
        for (let i = 0; i < lines.length; i++){
            page.drawText(lines[i], { x: boxX + padding, y: curY, size: fontSize, font });
            curY -= (fontSize + 3);
        }

        // Ajustar y para el siguiente campo, agregando un pequeño espacio
        const usedLines = Math.max(1, lines.length);
        y -= (lineHeight * usedLines) + 6;
    }

    // Recolectar valores del formulario HTML
    const get = id => (document.getElementById(id) ? document.getElementById(id).value : '');

    addFieldStatic('Pasajero:', get('pasajero'));
    addFieldStatic('DNI:', get('dni'));
    addFieldStatic('Teléfono:', get('telefono'));
    addFieldStatic('Email:', get('email'));
    addFieldStatic('Empresa:', get('empresa'));
    addFieldStatic('Servicio:', get('servicio'));
    addFieldStatic('Fecha Salida:', get('fechaDeViaje'));
    addFieldStatic('Fecha Regreso:', get('fechaRegreso'));
    addFieldStatic('Origen:', get('origen'));
    addFieldStatic('Destino:', get('destino'));
    addFieldStatic('Asiento:', get('asiento'));
    addFieldStatic('Seña:', get('sena'));
    addFieldStatic('Importe:', get('importe'));

    // Observaciones: usar un campo más alto y suficiente separación
    // Observaciones: dibujar un recuadro grande y ajustar texto dentro
    const obsHeight = 100;
    const obsY = y - obsHeight - 20; // dejar 20 pts de margen
    page.drawText('Observaciones:', { x: startX, y: obsY + obsHeight + 6, size: 12, font });
    const comentarios = get('comentarios') || '';
    const boxObsX = startX + 140;
    const boxObsW = 400;
    const boxObsH = obsHeight;
    // Recuadro para Observaciones
    page.drawRectangle({ x: boxObsX, y: obsY, width: boxObsW, height: boxObsH, borderColor: rgb(0,0,0), borderWidth: 1 });
    // Escribir texto dentro con padding
    const padding = 6;
    const maxWidthObs = boxObsW - padding * 2;
    const fontSizeObs = 11;
    const wordsObs = comentarios.split(/\s+/);
    let lineObs = '';
    let curYObs = obsY + boxObsH - padding - fontSizeObs;
    for (let i = 0; i < wordsObs.length; i++){
        const testLine = lineObs ? lineObs + ' ' + wordsObs[i] : wordsObs[i];
        const testWidth = font.widthOfTextAtSize(testLine, fontSizeObs);
        if (testWidth > maxWidthObs){
            page.drawText(lineObs, { x: boxObsX + padding, y: curYObs, size: fontSizeObs, font });
            lineObs = wordsObs[i];
            curYObs -= (fontSizeObs + 3);
        } else {
            lineObs = testLine;
        }
    }
    if (lineObs) page.drawText(lineObs, { x: boxObsX + padding, y: curYObs, size: fontSizeObs, font });

    // Añadir texto del footer (con ajuste de líneas) justo debajo de Observaciones
    const footerText = document.querySelector('footer p')?.textContent?.trim() || '';
    if (footerText) {
        const maxWidth = 515; // page width (595) - margins
        const fontSize = 9;
        const words = footerText.split(/\s+/);
        const lines = [];
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = line ? line + ' ' + words[i] : words[i];
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth > maxWidth) {
                lines.push(line);
                line = words[i];
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);

        // Position footer lines so the first line is just below the Observaciones box
        const lineHeight = 11;
        const startY = Math.max(obsY - 10, 20); // y for the first line (closest to Observaciones)
        for (let i = 0; i < lines.length; i++) {
            const yLine = startY - i * lineHeight; // subsequent lines go downwards
            page.drawText(lines[i], { x: startX, y: yLine, size: fontSize, font });
        }
    }

    // Guardar y descargar
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comprobante_viaje.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // Resetear todo el formulario después de la descarga
    const formEl = document.querySelector('form');
    if (formEl) {
        formEl.reset();
        const first = document.getElementById('pasajero') || formEl.querySelector('input, textarea, select');
        first?.focus();
    }
}

// Conectar el botón
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('download');
    if(btn) btn.addEventListener('click', generarPDF);
});

