const bill = document.getElementById('bill');
const grandBody = document.getElementById('grandBody');
let activeBlock = null;

function fmt(n) {
    return Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toString();
}

function lastBlock() {
    const blocks = document.querySelectorAll('tbody.block');
    return blocks[blocks.length - 1] || null;
}

function makeDateCell(tb) {
    const td = document.createElement('td');
    td.className = 'date';
    td.innerHTML =
        '<input class="fld datein" type="date" title="Pick a date (printed as DD/MM/YYYY)">' +
        '<input class="fld billname" type="text" placeholder="Bill name" title="Name for this date bill">' +
        '<button class="row-del no-export" type="button" tabindex="-1" title="Remove date">×</button>';
    td.querySelector('.row-del').addEventListener('click', () => removeBlock(tb));
    return td;
}

function refreshBlock(tb) {
    const items = [...tb.querySelectorAll('tr.item')];
    items.forEach((tr, i) => { tr.querySelector('.n').textContent = i + 1; });

    if (!tb._dateTd) tb._dateTd = makeDateCell(tb);
    tb._dateTd.rowSpan = items.length + 1;
    if (tb._dateTd.parentNode !== items[0]) items[0].prepend(tb._dateTd);

    let sum = 0;
    tb.querySelectorAll('.price').forEach(p => {
        sum += parseFloat(p.value.replace(/,/g, '')) || 0;
    });
    tb.querySelector('.tot-val').textContent = fmt(sum);
    updateGrand();
}

function updateGrand() {
    let sum = 0;
    document.querySelectorAll('tbody.block .tot-val').forEach(v => {
        sum += parseFloat(v.textContent) || 0;
    });
    document.getElementById('grandTotal').textContent = fmt(sum);
}

function addItemRow(tb, focus = true) {
    const tr = document.createElement('tr');
    tr.className = 'item';
    tr.innerHTML =
        '<td class="num" tabindex="-1"><span class="n"></span>' +
        '<button class="row-del no-export" type="button" tabindex="-1" title="Remove item">×</button></td>' +
        '<td><input class="fld name" type="text" autocomplete="off"></td>' +
        '<td><input class="fld qty" type="text"></td>' +
        '<td><input class="fld price" type="text" inputmode="decimal"></td>';

    tb.insertBefore(tr, tb.querySelector('tr.total'));

    tr.querySelector('.row-del').addEventListener('click', () => removeItemRow(tb, tr));
    const price = tr.querySelector('.price');
    price.addEventListener('input', () => refreshBlock(tb));
    price.addEventListener('keydown', e => {
        if (e.key === 'Tab' && !e.shiftKey) {
            // Tab from the last cell of the last row adds a new numbered row
            const items = tb.querySelectorAll('tr.item');
            if (items[items.length - 1] === tr) {
                e.preventDefault();
                addItemRow(tb);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const next = tr.nextElementSibling;
            if (next && next.classList.contains('item')) next.querySelector('.name').focus();
            else addItemRow(tb);
        }
    });

    refreshBlock(tb);
    if (focus) tr.querySelector('.name').focus();
    return tr;
}

function removeItemRow(tb, tr) {
    if (tb.querySelectorAll('tr.item').length <= 1) return;
    if (tb._dateTd && tb._dateTd.parentNode === tr) tb._dateTd.remove();
    tr.remove();
    refreshBlock(tb);
}

function makeBlock(items) {
    const tb = document.createElement('tbody');
    tb.className = 'block';
    tb.innerHTML = '<tr class="total"><td colspan="3" class="tot">Total</td><td class="tot-val">0</td></tr>';
    bill.insertBefore(tb, grandBody);
    tb.addEventListener('focusin', () => { activeBlock = tb; });
    for (let i = 0; i < items; i++) addItemRow(tb, false);
    activeBlock = tb;
    return tb;
}

function removeBlock(tb) {
    if (document.querySelectorAll('tbody.block').length <= 1) return;
    tb.remove();
    if (activeBlock === tb) activeBlock = null;
    updateGrand();
}

// Arrow keys move between cells: Up/Down = same column in the next/previous row,
// Left/Right = previous/next column in the same row
document.addEventListener('keydown', e => {
    const cur = e.target;
    if (!cur.matches || !cur.matches('#bill input.fld')) return;
    const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const dir = dirs[e.key];
    if (!dir) return;

    // Left/Right inside a text cell: only switch columns at the start/end of the text,
    // so normal cursor movement while typing still works
    if ((dir === 'left' || dir === 'right') && cur.type === 'text') {
        const atStart = cur.selectionStart === 0 && cur.selectionEnd === 0;
        const atEnd = cur.selectionEnd === cur.value.length;
        if (dir === 'left' && !atStart) return;
        if (dir === 'right' && !atEnd) return;
    }

    let target = null;
    if (dir === 'up' || dir === 'down') {
        const step = dir === 'up' ? -1 : 1;
        if (cur.classList.contains('datein') || cur.classList.contains('billname')) {
            const cls = cur.classList.contains('billname') ? 'billname' : 'datein';
            const blocks = [...document.querySelectorAll('#bill tbody.block')];
            const next = blocks[blocks.indexOf(cur.closest('tbody.block')) + step];
            if (next) target = next.querySelector('.' + cls);
        } else {
            const col = ['name', 'qty', 'price'].find(c => cur.classList.contains(c));
            const rows = [...document.querySelectorAll('#bill tr.item')];
            const row = cur.closest('tr.item');
            const next = rows[rows.indexOf(row) + step];
            if (next) target = next.querySelector('.' + col);
        }
    } else {
        const row = cur.closest('tr.item');
        const cols = [...row.querySelectorAll('input.fld')]; // date (first row only), name, qty, price
        const step = dir === 'left' ? -1 : 1;
        target = cols[cols.indexOf(cur) + step] || null;
    }

    if (target) {
        e.preventDefault();
        target.focus();
        if (target.type === 'text' && target.select) target.select();
    }
});

// Ctrl + (or Ctrl =) with the cursor in the নং or তারিখ column adds a column/row
let focusedCell = null;
document.addEventListener('focusin', e => { focusedCell = e.target; });

document.addEventListener('keydown', e => {
    const isPlus = (e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=');
    if (!isPlus || !focusedCell) return;

    const numCell = focusedCell.closest && focusedCell.closest('td.num');
    const dateCell = focusedCell.closest && focusedCell.closest('td.date');

    if (numCell) {
        e.preventDefault();
        const tb = numCell.closest('tbody.block');
        if (tb) addItemRow(tb);
    } else if (dateCell) {
        e.preventDefault();
        makeBlock(3);
    }
});

// Header "+" beside তারিখ: new date block
document.getElementById('addDate').addEventListener('click', () => makeBlock(3));

// Header "+" beside নং: new numbered item in the active date block
document.getElementById('addItem').addEventListener('click', () => {
    const tb = (activeBlock && document.body.contains(activeBlock)) ? activeBlock : lastBlock();
    if (!tb) makeBlock(3);
    else addItemRow(tb);
});

// Starting layout matches the sample bill: 3 rows, then 4 rows
makeBlock(3);
makeBlock(4);
updateGrand();

// ---------- Download (JPG + single-page PDF) ----------
document.getElementById('downloadBtn').addEventListener('click', downloadBill);

async function downloadBill() {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.textContent = 'Preparing...';
    try {
        const page = document.getElementById('page');
        const clone = page.cloneNode(true);
        clone.querySelectorAll('.no-export').forEach(el => el.remove());

        // Replace inputs with plain text so the image matches the printed bill
        const originals = page.querySelectorAll('input');
        const copies = clone.querySelectorAll('input');
        copies.forEach((inp, i) => {
            const orig = originals[i];
            const d = document.createElement('div');
            d.className = inp.className;
            let v = orig ? orig.value : '';
            if (inp.classList.contains('datein') && v) {
                // date input gives YYYY-MM-DD; print it as DD/MM/YYYY
                const [y, m, dd] = v.split('-');
                v = `${dd}/${m}/${y}`;
            }
            d.textContent = v;
            inp.replaceWith(d);
        });

        clone.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;margin:0;box-shadow:none;';
        document.body.appendChild(clone);
        const rendered = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff' });
        clone.remove();
        // Shrink the whole bill to fit exactly one A4 sheet (no-op if it already fits)
        const canvas = fitToA4(rendered);

        const jpg = dataUrlBytes(canvas.toDataURL('image/jpeg', 0.95));
        const base = 'ashok_fruit_shop_bill_' + new Date().toISOString().slice(0, 10);
        saveBlob(new Blob([jpg], { type: 'image/jpeg' }), base + '.jpg');
        saveBlob(makePdf(jpg, canvas.width, canvas.height), base + '.pdf');
    } catch (err) {
        alert('Download failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Download PDF + JPG';
    }
}

function dataUrlBytes(url) {
    const bin = atob(url.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

// Builds a one-page PDF that embeds the JPEG at full page size (no external library)
// A4 at 96 dpi is 794 x 1123 px; the canvas is rendered at 2x for sharpness.
const A4_W = 794 * 2;
const A4_H = 1123 * 2;

// Scales the bill down (proportionally, so fonts and boxes shrink together)
// when it is taller or wider than one A4 sheet, and centres it on an A4 canvas.
function fitToA4(src) {
    const scale = Math.min(1, A4_H / src.height, A4_W / src.width);
    const out = document.createElement('canvas');
    out.width = A4_W;
    out.height = A4_H;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4_W, A4_H);
    const dw = src.width * scale;
    const dh = src.height * scale;
    ctx.drawImage(src, (A4_W - dw) / 2, 0, dw, dh);
    return out;
}

function makePdf(jpg, W, H) {
    // A4 page in PDF points
    const pw = 595;
    const ph = 842;
    const enc = new TextEncoder();
    const parts = [];
    const offs = [];
    let off = 0;
    const push = d => {
        const u = typeof d === 'string' ? enc.encode(d) : d;
        parts.push(u);
        off += u.length;
    };
    const obj = (n, body) => {
        offs[n] = off;
        push(`${n} 0 obj\n${body}\nendobj\n`);
    };

    push('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] ` +
        `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
    const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    offs[5] = off;
    push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
    push(jpg);
    push('\nendstream\nendobj\n');

    const xref = off;
    let x = 'xref\n0 6\n0000000000 65535 f \n';
    for (let n = 1; n <= 5; n++) x += String(offs[n]).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(x);

    return new Blob(parts, { type: 'application/pdf' });
}

function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// ---------- Fruit name suggestions: all shown at once, in Bengali alphabetical order ----------
(function setupFruitPanel() {
    const FRUITS = [
        'আম', 'আপেল', 'লাল আঙুর', 'আঙুর', 'আনারস', 'কমলা', 'লিচু', 'কলা', 'পানিফল', 'খেজুর',
        'জাম', 'তরমুজ', 'পেঁপে', 'পেয়ারা', 'নারকেল', 'নাশপাতি', 'বেদানা', 'বাতাবি', 'মালটা',
        'মৌসুম্বি', 'শসা', 'সবেদা', 'আলুবোখারা', 'চেরি', 'তাল', 'কিসমিস', 'বাদাম', 'কাজু'
    ].sort(new Intl.Collator('bn').compare);

    const panel = document.createElement('div');
    panel.id = 'fruitPanel';
    panel.className = 'fruit-panel no-export';
    panel.hidden = true;
    FRUITS.forEach(name => {
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1;
        b.className = 'fruit-opt';
        b.textContent = name;
        // mousedown (not click) with preventDefault keeps focus in the name cell
        b.addEventListener('mousedown', e => {
            e.preventDefault();
            if (!activeNameInput) return;
            activeNameInput.value = name;
            activeNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            hidePanel();
        });
        panel.appendChild(b);
    });
    document.body.appendChild(panel);

    let activeNameInput = null;

    function showPanel(input) {
        activeNameInput = input;
        const r = input.getBoundingClientRect();
        panel.style.left = Math.max(8, r.left) + 'px';
        panel.style.top = (r.bottom + 4) + 'px';
        panel.style.minWidth = Math.max(r.width, 300) + 'px';
        panel.hidden = false;
    }

    function hidePanel() {
        panel.hidden = true;
        activeNameInput = null;
    }

    document.addEventListener('focusin', e => {
        if (e.target.matches && e.target.matches('#bill input.name')) showPanel(e.target);
    });
    document.addEventListener('focusout', e => {
        if (e.target === activeNameInput) hidePanel();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') hidePanel();
    });
    window.addEventListener('scroll', () => {
        if (activeNameInput) showPanel(activeNameInput);
    }, true);
    window.addEventListener('resize', hidePanel);
})();