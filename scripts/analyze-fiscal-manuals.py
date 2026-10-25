import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def extract_toc(pdf_path):
    print(f"\n=======================================================")
    print(f" ANALIZANDO: {pdf_path}")
    print(f"=======================================================")
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total de páginas: {len(reader.pages)}")
    
    # Buscar índice en las primeras 10 páginas
    for page_idx in range(min(12, len(reader.pages))):
        text = reader.pages[page_idx].extract_text() or ''
        lines = text.split('\n')
        for line in lines:
            if any(k in line.lower() for k in ['factura', 'comando', 'protocolo', 'reporte', 'igtf', 'pago', 'nota de', 'devoluci', 'cierre', 'tabla']):
                print(f"[Pág {page_idx+1}] {line.strip()[:100]}")

extract_toc(r"C:\Users\e\Documents\Guardian\nueva impresora\[VE]Manual_de_Protocolos_y_Comandos_Venezuela_V0805R00_1.pdf")
extract_toc(r"C:\Users\e\Documents\Guardian\nueva impresora\NUEVO_IMPUESTO_IGTF.pdf")
