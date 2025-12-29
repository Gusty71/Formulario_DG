document.getElementById('download').addEventListener('click', async (e) => {
    e.preventDefault?.();
    try {
        if (typeof PDFLib === 'undefined') {
            const msg = 'La librería pdf-lib no está cargada. Asegúrate de incluir el script CDN en index.html.';
            console.error(msg);
            alert(msg);
            return;
        }
        const { PDFDocument, StandardFonts, rgb } = PDFLib;

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 en puntos
        const form = pdfDoc.getForm();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pageHeight = page.getHeight();

    // Incrustar logo (si existe) y cabecera dinámica
    let imgHeight = 0;
    try {
        const logoUrl = 'imagen/image.png';
        const res = await fetch(logoUrl);
        if (res.ok) {
            const logoBytes = await res.arrayBuffer();
            const pngImage = await pdfDoc.embedPng(logoBytes);
            const imgWidth = 90;
            imgHeight = (pngImage.height / pngImage.width) * imgWidth;
            const logoY = pageHeight - imgHeight - 20;
            page.drawImage(pngImage, { x: 40, y: logoY, width: imgWidth, height: imgHeight });
        }
    } catch (e) {
        console.warn('No se pudo cargar el logo:', e);
    }

    // Cabecera: posicion dinámica según logo
    const headerTop = imgHeight ? pageHeight - imgHeight - 30 : pageHeight - 40;
    page.drawText('DG TURISMO', { x: 140, y: headerTop, size: 18, font });
    page.drawText('COMPROBANTE DE VIAJE', { x: 40, y: headerTop - 30, size: 14, font });

    // Base Y para campos (debajo del encabezado) y espaciado
    const baseY = headerTop - 90;
    const rowHeight = 48;
    const fieldHeight = 22;
    const labelGap = 8;

    // Filas con campos (x, id, width)
    const rows = [
        [{ id: 'pasajero', x: 40, w: 300 }, { id: 'dni', x: 360, w: 150 }],
        [{ id: 'telefono', x: 40, w: 200 }, { id: 'email', x: 260, w: 250 }],
        [{ id: 'empresa', x: 40, w: 300 }, { id: 'servicio', x: 360, w: 150 }],
        [{ id: 'fechaDeViaje', x: 40, w: 140 }, { id: 'fechaRegreso', x: 200, w: 140 }],
        [{ id: 'origen', x: 40, w: 220 }, { id: 'destino', x: 280, w: 220 }],
        [{ id: 'asiento', x: 40, w: 100 }, { id: 'sena', x: 160, w: 120 }, { id: 'importe', x: 300, w: 120 }],
    ];

    for (let r = 0; r < rows.length; r++) {
        const y = baseY - r * rowHeight;
        for (const cell of rows[r]) {
            const labelEl = document.querySelector(`label[for="${cell.id}"]`);
            const labelText = labelEl ? labelEl.textContent.trim() : (cell.id === 'sena' ? 'Entrega de Seña' : cell.id);
            // dibujar label encima del campo
            page.drawText(labelText, { x: cell.x, y: y + fieldHeight + labelGap, size: 10, font });

            // dibujar rectángulo de fondo/borde para mejorar legibilidad
            page.drawRectangle({ x: cell.x - 2, y: y - 2, width: cell.w + 4, height: fieldHeight + 4, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.8 });

            const val = document.getElementById(cell.id)?.value || '';
            const fld = form.createTextField(cell.id);
            fld.setText(val);
            fld.addToPage(page, { x: cell.x, y: y, width: cell.w, height: fieldHeight });
        }
    }

    // Registro, CUIT, Fecha Venta en cabecera
    const registro = document.getElementById('registro')?.textContent || '';
    const cuit = document.getElementById('cuit')?.textContent || '';
    page.drawText(`Matricula: ${registro}`, { x: 40, y: pageHeight - 20, size: 10, font });
    page.drawText(`CUIT: ${cuit}`, { x: 220, y: pageHeight - 20, size: 10, font });

    // Campo editable Fecha Venta en cabecera (con label)
    const fechaVentaVal = document.getElementById('fechaVenta')?.value || '';
    // dibujar label de Fecha de Venta
    page.drawText('Fecha de Venta:', { x: 360, y: headerTop - 6, size: 10, font });
    const fechaField = form.createTextField('fechaVenta');
    fechaField.setText(fechaVentaVal);
    // Ubicarlo debajo del label
    fechaField.addToPage(page, { x: 380, y: headerTop - 20, width: 120, height: 16 });

    // Observaciones: mover al pie del documento
    const obsY = 120; // distancia desde la parte inferior
    const comentariosVal = document.getElementById('comentarios')?.value || '';
    const comentariosFld = form.createTextField('comentarios');
    comentariosFld.setText(comentariosVal);
    // campo ancho y alto en el pie
    comentariosFld.addToPage(page, { x: 340, y: obsY, width: 470, height: 140 });

    // Añadir texto del footer (con ajuste de líneas)
    const footerText = document.querySelector('footer p')?.textContent?.trim() || '';
    if (footerText) {
        const maxWidth = 515; // margen lateral (page width ~595) - 40*2
        const fontSize = 7;
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

        // dibujar todas las líneas empezando desde y=40 y subiendo
        let cursorY = 40;
        const lineHeight = 11;
        for (let i = 0; i < lines.length; i++) {
            page.drawText(lines[i], { x: 40, y: cursorY, size: fontSize, font });
            cursorY += lineHeight;
        }
    }

        form.updateFieldAppearances(font);

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'formulario_editable.pdf';
        // Use a dispatched click event for better compatibility
        link.dispatchEvent(new MouseEvent('click'));
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    finally {
        // Cualquier limpieza si es necesaria
    }
});