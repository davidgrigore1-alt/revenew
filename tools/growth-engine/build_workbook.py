#!/usr/bin/env python3
"""Build the V1 executive prospecting workbook using artifact_tool."""
import csv
import json
from pathlib import Path
from artifact_tool import Workbook, SpreadsheetFile

ROOT=Path(__file__).resolve().parent
out=ROOT/'reports'/'ReveNew_Prospectare_V1.xlsx'
rows=list(csv.DictReader((ROOT/'reports'/'Prospects_V1.csv').open(encoding='utf-8-sig',newline='')))
copy=json.loads((ROOT/'data'/'curated_copy.json').read_text(encoding='utf-8'))
wb=Workbook.create()
summary=wb.worksheets.add('Dashboard')
accounts=wb.worksheets.add('Companii')
drafts=wb.worksheets.add('Drafturi')
operation=wb.worksheets.add('Operare')
navy='#101112'; blue='#245CD9'; white='#FFFFFF'; ink='#1A2028'; light='#EFF3FA'; line='#D9E2EC';muted='#617083'
heading={'fill':navy,'font':{'bold':True,'color':white},'row_height':31,'vertical_alignment':'center'}
subhead={'fill':blue,'font':{'bold':True,'color':white},'row_height':28,'vertical_alignment':'center'}

summary.get_range('A1:H2').merge();summary.get_range('A1').values=[['ReveNew  /  Growth Engine V1']]
summary.get_range('A1:H2').format={'fill':navy,'font':{'bold':True,'size':18,'color':white},'vertical_alignment':'center','row_height':26}
summary.get_range('A4:H4').merge();summary.get_range('A4').values=[['Pilot de prospectare intern · 30 octombrie 2026 · NU trimitere automată']]
summary.get_range('A4:H4').format={'font':{'color':muted,'size':11},'row_height':27}
metrics=[('Companii în cercetare','=COUNTA(Companii!A2:A17)'),('Surse revizuite','=COUNTIF(Companii!G2:G17,"SOURCE_REVIEWED")'),('Emailuri preview','=COUNTA(Drafturi!A2:A8)'),('Contacte eligibile','=SUM(Companii!M2:M17)')]
for i,(name,formula) in enumerate(metrics):
    column=1+i*2
    r=summary.get_range_by_indexes(5,column-1,1,2);r.merge();r.values=[[name]]
    r.format={'fill':light,'font':{'bold':True,'color':ink,'size':11},'row_height':27}
    val=summary.get_range_by_indexes(6,column-1,2,2);val.merge()
    summary.get_cell(6,column-1).formulas=[[formula]]
    val.format={'fill':light,'font':{'bold':True,'color':blue,'size':23},'row_height':27}
summary.get_range('A11:H11').merge();summary.get_range('A11').values=[['PRIORITATE DE EXECUȚIE']];summary.get_range('A11:H11').format=subhead
steps=[
'1. Revizuiește paginile oficiale și verifică cine ar putea evalua un pilot.',
'2. Pregătește o demonstrație pe un singur flux (fără date ale companiilor).',
'3. Obține acordul valid pentru comunicare și documentează dovada.',
'4. Aprobă individual drafturile. Nu presupune probleme interne ale firmei.',
'5. Configurează @revenew.ro, SPF/DKIM/DMARC și testează înainte de expediere.',
]
for i,x in enumerate(steps,start=12):
    summary.get_range(f'A{i}:H{i}').merge();summary.get_range(f'A{i}').values=[[x]]
    summary.get_range(f'A{i}:H{i}').format={'font':{'color':ink,'size':11},'row_height':25}
summary.get_range('A19:H19').merge();summary.get_range('A19').values=[['PRINCIPIILE SCORULUI']];summary.get_range('A19:H19').format=subhead
for n,line_ in enumerate(['Fit 0–100 = ipoteză calculată pe 6 criterii, nu o măsurătoare comercială.','Prioritate = 72% × Fit + 28% × (Accesibilitate estimată/4 × 100).','Firmele nu au fost contactate și niciuna nu este confirmată ca interesată.'],start=20):
    summary.get_range(f'A{n}:H{n}').merge();summary.get_range(f'A{n}').values=[[line_]];summary.get_range(f'A{n}:H{n}').format={'font':{'color':muted,'size':11},'row_height':22}
summary.get_range('A:H').format.column_width=13

headers=['Companie','Domeniu','Sector','Fit /100','Acces /4','Prioritate*','Stadiu cercetare','Sursă oficială','Observație publică','Ipoteză scenariu','Flux demo','Verificat la','Contact eligibil','Următoarea acțiune']
accounts.get_range('A1:N1').values=[headers]
accounts.get_range('A1:N1').format=heading
values=[]
for r in rows:
    name=r['Companie']; domain=r['Domeniu'];verified=r['Research']=='SOURCE_REVIEWED'
    values.append([name,domain,r['Sector'],int(r['Scor fit (ipoteza)']),int(r['Acces pilot estimat 0-4']),None,
                   r['Research'],r['Dovada (pagina)'],r['Observatie publică'],r['Ipoteza demo'],r['Flux demo'],
                   r['Data verificare'],int(r['Contact eligibil']),
                   'Identifică decidentul și verifică permisiunea' if verified else 'Revizuiește sursa oficială'])
accounts.get_range('A2:N17').values=values
accounts.get_range('F2').formulas=[['=ROUND(0.72*D2+0.28*(E2/4*100),0)']]
accounts.get_range('F2:F17').fill_down()
accounts.freeze_panes.freeze_rows(1)
for col,width in {'A':24,'B':20,'C':21,'D':11,'E':11,'F':12,'G':20,'H':35,'I':40,'J':40,'K':35,'L':15,'M':17,'N':37}.items():
    accounts.get_range(f'{col}:{col}').format.column_width=width
accounts.get_range('A2:N17').format.row_height=37
accounts.get_range('G2:G17').conditional_formats.add_custom('=G2="SOURCE_REVIEWED"', {'fill':'#E9F5EC','font':{'color':'#287440'}})
accounts.get_range('G2:G17').conditional_formats.add_custom('=G2="PENDING"', {'fill':'#FFF3E2','font':{'color':'#995B14'}})
accounts.get_range('A2:N17').format.wrap_text=True
accounts.get_range('F2:F17').conditional_formats.add_data_bar({'color':blue,'gradient':False})
accounts.tables.add('A1:N17',True,'ReveNewCompanies')

copyrows=[]
for r in rows:
    domain=r['Domeniu']
    if domain not in copy:continue
    item=copy[domain]
    copyrows.append([r['Companie'],domain,item['subject'],item['body'],'PENDING (nu trimite)',r['Dovada (pagina)']])
drafts.get_range('A1:F1').values=[['Companie','Domeniu','Subiect','Corp email - preview','Status','Sursă']]
drafts.get_range('A1:F1').format=heading
drafts.get_range(f'A2:F{len(copyrows)+1}').values=copyrows
drafts.get_range(f'A2:F{len(copyrows)+1}').format.wrap_text=True
drafts.get_range(f'A2:F{len(copyrows)+1}').format.row_height=114
drafts.get_range('A:A').format.column_width=24;drafts.get_range('B:B').format.column_width=19
drafts.get_range('C:C').format.column_width=38;drafts.get_range('D:D').format.column_width=66
drafts.get_range('E:E').format.column_width=24;drafts.get_range('F:F').format.column_width=48
drafts.freeze_panes.freeze_rows(1)
drafts.tables.add(f'A1:F{len(copyrows)+1}',True,'ReveNewDrafts')

operation.get_range('A1:H2').merge();operation.get_range('A1').values=[['Protocol operațional — înainte de primul email']]
operation.get_range('A1:H2').format={'fill':navy,'font':{'bold':True,'color':white,'size':16},'row_height':26}
ops=[
('Sursă publică','Concret, relevantă și reverificată. Excerpt și URL în registru.'),
('Acces pilot','Prioritate și disponibilitate de evaluat. Scorurile sunt ipoteze.'),
('Identificarea persoanei','Nu colecta automat adrese personale din pagini publice ca bază pentru trimiteri.'),
('Bază legală','Legea 506/2004 art. 12: consimțământ expres prealabil ca regulă. Excepții limitate.'),
('Copiere și aprobare','Fiecare email trebuie citit și aprobat, fără promisiuni neprobate.'),
('Identitatea domeniului','Verifică SPF, DKIM, DMARC, MX, aliasul și căsuța funcțională @revenew.ro.'),
('Livrare','Pilot mic, reclamații și refuzuri monitorizate; fără volum agresiv.'),
('Opoziție','Elimină imediat contactul din orice flux după refuz/dezabonare.'),
('Ce măsurăm','Conversații relevante, întâlniri, piloți, clienți. NU open rate.'),
('Protecția datelor','Nu încărca baza de date locală cu contacte personale într-un repository public.'),
]
operation.get_range('A4:B4').values=[['Verificare','Regula de operare']]
operation.get_range('A4:B4').format=subhead
operation.get_range('A5:B14').values=[list(x) for x in ops]
operation.get_range('A:A').format.column_width=28
operation.get_range('B:B').format.column_width=97
operation.get_range('A5:B14').format.row_height=34
operation.get_range('A5:B14').format.wrap_text=True
operation.get_range('A17:H17').merge();operation.get_range('A17').values=[['Surse juridice și tehnice']];operation.get_range('A17:H17').format=subhead
for idx,link in enumerate(['https://legislatie.just.ro/Public/DetaliiDocument/257056','https://support.google.com/mail/answer/81126','https://developers.google.com/workspace/gmail/api/guides/drafts'],start=18):
    operation.get_range(f'A{idx}:H{idx}').merge()
    operation.get_range(f'A{idx}').values=[[link]]
    operation.get_range(f'A{idx}').format={'font':{'color':blue,'size':11},'row_height':22}

out.parent.mkdir(exist_ok=True,parents=True)
print('CHECK dashboard',wb.inspect({'kind':'table','range':'Dashboard!A6:H8','include':'values,formulas','table_max_rows':4,'table_max_cols':8}).ndjson[:1300])
print('CHECK companies',wb.inspect({'kind':'table','range':'Companii!A1:G4','include':'values,formulas','table_max_rows':4,'table_max_cols':7}).ndjson[:1700])
SpreadsheetFile.export_xlsx(wb).save(str(out))
print('XLSX saved:',out)
