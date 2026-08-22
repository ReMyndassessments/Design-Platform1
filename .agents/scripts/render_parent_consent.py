from pathlib import Path

import fitz


pdf_path = Path("attached_assets/Parent_Consent_Form_1787371780866.pdf")
output_dir = Path(".agents/outputs/parent-consent-pages")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(pdf_path)
print(f"pages={document.page_count}")
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    output_path = output_dir / f"page-{index + 1:02d}.png"
    pixmap.save(output_path)
    print(output_path)