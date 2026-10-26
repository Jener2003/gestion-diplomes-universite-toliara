"""
Génère le dictionnaire des données (PDF) à partir des modèles Django.

Usage (depuis le dossier gestion-diplomes) :
    backend/venv/Scripts/python.exe generate_dictionnaire_donnees.py [sortie.pdf]

Par défaut, le PDF est écrit dans ../Dictionnaire_des_donnees_Gestion_Diplomes.pdf
"""
import os, sys, json, datetime
from pathlib import Path

ICI = Path(__file__).resolve().parent
BACKEND = ICI / 'backend'
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()


def extraire_schema():
    from django.apps import apps
    from django.db import connection
    APPS = ['utilisateurs','demandes','diplomes','notifications','administration']
    out = []
    for label in APPS:
        for m in apps.get_app_config(label).get_models():
            fields = []
            for f in m._meta.concrete_fields:
                rel = None
                if f.is_relation:
                    rel = {'table': f.related_model._meta.db_table, 'model': f.related_model.__name__,
                           'on_delete': f.remote_field.on_delete.__name__, 'one_to_one': f.one_to_one}
                fields.append({
                    'name': f.name, 'column': f.column, 'internal': f.get_internal_type(),
                    'db_type': f.db_type(connection), 'max_length': getattr(f, 'max_length', None),
                    'null': f.null, 'blank': f.blank, 'unique': f.unique, 'pk': f.primary_key,
                    'index': f.db_index,
                    'default': None if not f.has_default() else (repr(f.default) if not callable(f.default) else f.default.__name__),
                    'auto_now': getattr(f,'auto_now',False), 'auto_now_add': getattr(f,'auto_now_add',False),
                    'verbose': str(f.verbose_name), 'help': str(f.help_text or ''),
                    'choices': [[str(a), str(b)] for a, b in f.choices] if f.choices else None,
                    'rel': rel})
            m2m = [{'name': f.name, 'through': f.remote_field.through._meta.db_table, 'to': f.related_model._meta.db_table}
                   for f in m._meta.many_to_many]
            out.append({'app': label, 'model': m.__name__, 'table': m._meta.db_table,
                        'verbose': str(m._meta.verbose_name), 'doc': (m.__doc__ or '').strip() if not (m.__doc__ or '').startswith(m.__name__+'(') else '',
                        'fields': fields, 'm2m': m2m})
    return {'vendor': connection.vendor, 'models': out}


from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether, CondPageBreak)
from reportlab.platypus.tableofcontents import TableOfContents

out_path = sys.argv[1] if len(sys.argv) > 1 else str(ICI.parent / 'Dictionnaire_des_donnees_Gestion_Diplomes.pdf')
data = extraire_schema()

F = 'C:/Windows/Fonts/'
pdfmetrics.registerFont(TTFont('Arial', F + 'arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', F + 'arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic', F + 'ariali.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-Bold')

NAVY = colors.HexColor('#1F3A5F'); LIGHT = colors.HexColor('#E8EEF5'); GRID = colors.HexColor('#9AA9BC')
ZEBRA = colors.HexColor('#F6F8FB')

st = lambda name, **kw: ParagraphStyle(name, fontName=kw.pop('fontName', 'Arial'), **kw)
sTitle = st('t', fontName='Arial-Bold', fontSize=26, leading=32, alignment=TA_CENTER, textColor=NAVY)
sSub = st('s', fontSize=14, leading=20, alignment=TA_CENTER, textColor=colors.HexColor('#444444'))
sH1 = st('h1', fontName='Arial-Bold', fontSize=15, leading=19, textColor=NAVY, spaceBefore=4, spaceAfter=6)
sH2 = st('h2', fontName='Arial-Bold', fontSize=12, leading=15, textColor=NAVY, spaceBefore=8, spaceAfter=4)
sBody = st('b', fontSize=9.5, leading=13, spaceAfter=4)
sCell = st('c', fontSize=7.8, leading=9.6)
sCellB = st('cb', fontName='Arial-Bold', fontSize=7.8, leading=9.6)
sHead = st('hd', fontName='Arial-Bold', fontSize=8, leading=10, textColor=colors.white)
sMeta = st('m', fontSize=9, leading=12, textColor=colors.HexColor('#333333'))

def esc(s): return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

# ---------- Descriptions métier (FR) ----------
TABLE_DESC = {
 'Utilisateur': "Comptes des agents de l'application (authentification Django étendue). Chaque compte porte un rôle du circuit des diplômes ou le rôle d'administrateur système.",
 'Etudiant': "Référentiel des étudiants bénéficiaires d'une demande de diplôme.",
 'OTPCode': "Codes à usage unique (6 chiffres) envoyés par e-mail pour la double authentification. Validité : 10 minutes, 5 tentatives au maximum.",
 'DemandeDiplome': "Dossier de demande de diplôme d'un étudiant : pièces justificatives, statut dans le circuit, acteurs assignés et dates de chaque jalon.",
 'Historique': "Traçabilité de chaque action effectuée sur une demande (changement de statut, commentaire, acteur et rôle au moment de l'action).",
 'Diplome': "Registre officiel du diplôme délivré, lié 1-1 à la demande qui l'a produit. Le numéro et le code sont réservés à l'impression ; la date de délivrance est fixée à la signature de la Présidence.",
 'Notification': "Notifications internes adressées à un utilisateur (affichées dans l'application).",
 'JournalActivite': "Journal des opérations d'administration et des événements de sécurité. Une entrée n'est jamais modifiée ni supprimée et ne contient aucun secret.",
 'AdresseNotificationEquipe': "Adresse e-mail fonctionnelle (boîte partagée) de chaque équipe métier : reçoit les codes de vérification et une copie des notifications d'équipe.",
}
TABLE_TITLE = {
 'Utilisateur': 'Utilisateur', 'Etudiant': 'Étudiant', 'OTPCode': 'Code OTP',
 'DemandeDiplome': 'Demande de diplôme', 'Historique': 'Historique des demandes', 'Diplome': 'Diplôme',
 'Notification': 'Notification', 'JournalActivite': "Journal d'activité",
 'AdresseNotificationEquipe': "Adresse de notification d'équipe",
}
D = {
 ('*','id'): "Identifiant technique unique (clé primaire auto-incrémentée)",
 ('Utilisateur','password'): "Empreinte (hachage) du mot de passe — jamais stocké en clair",
 ('Utilisateur','last_login'): "Date et heure de la dernière connexion",
 ('Utilisateur','is_superuser'): "Indique un super-utilisateur Django (tous droits)",
 ('Utilisateur','username'): "Identifiant de connexion unique",
 ('Utilisateur','first_name'): "Prénom de l'agent",
 ('Utilisateur','last_name'): "Nom de l'agent",
 ('Utilisateur','email'): "Adresse e-mail personnelle de l'agent",
 ('Utilisateur','is_staff'): "Accès à l'interface d'administration Django",
 ('Utilisateur','is_active'): "Compte actif (Faux = compte désactivé)",
 ('Utilisateur','date_joined'): "Date de création du compte",
 ('Utilisateur','role'): "Rôle de l'agent dans le circuit (voir liste ROLE)",
 ('Utilisateur','etablissement'): "Établissement / faculté de rattachement",
 ('Utilisateur','inscription'): "État de l'auto-inscription (vide = compte utilisable ; voir liste INSCRIPTION)",
 ('Utilisateur','derniere_activite'): "Dernière activité détectée (statut de présence)",
 ('Utilisateur','derniere_deconnexion'): "Date de la dernière déconnexion",
 ('Etudiant','utilisateur'): "Compte utilisateur éventuellement associé à l'étudiant",
 ('Etudiant','matricule'): "Numéro matricule de l'étudiant",
 ('Etudiant','nom'): "Nom de famille", ('Etudiant','prenom'): "Prénom(s)",
 ('Etudiant','date_naissance'): "Date de naissance",
 ('Etudiant','cin'): "Numéro de la carte d'identité nationale",
 ('Etudiant','faculte'): "Faculté / établissement d'inscription",
 ('Etudiant','filiere'): "Filière suivie", ('Etudiant','niveau_etude'): "Niveau d'étude (Licence, Master...)",
 ('Etudiant','photo'): "Chemin de la photo d'identité (media/photos_etudiants/)",
 ('OTPCode','utilisateur'): "Utilisateur à qui le code a été envoyé",
 ('OTPCode','code'): "Code numérique à 6 chiffres (généré par CSPRNG)",
 ('OTPCode','created_at'): "Date de génération (début de la validité de 10 min)",
 ('OTPCode','is_used'): "Code déjà consommé",
 ('OTPCode','tentatives'): "Nombre de saisies erronées (blocage à 5)",
 ('DemandeDiplome','etudiant'): "Étudiant demandeur",
 ('DemandeDiplome','type_diplome'): "Type de diplôme demandé (Licence, Master, Doctorat...)",
 ('DemandeDiplome','annee_universitaire'): "Année universitaire d'obtention (ex. 2024-2025)",
 ('DemandeDiplome','date_demande'): "Date de dépôt de la demande (automatique)",
 ('DemandeDiplome','statut'): "Étape courante dans le circuit (voir liste STATUT_DEMANDE)",
 ('DemandeDiplome','recu_bancaire'): "Fichier du reçu bancaire / bordereau (media/bordereaux/)",
 ('DemandeDiplome','pv_soutenance_file'): "Fichier du PV de soutenance (media/pv_soutenance/)",
 ('DemandeDiplome','releve_notes_file'): "Fichier du relevé de notes (media/releves/)",
 ('DemandeDiplome','certificat_scolarite_file'): "Fichier du certificat de scolarité (media/certificats/)",
 ('DemandeDiplome','has_pv_soutenance'): "PV de soutenance fourni",
 ('DemandeDiplome','has_releve_notes'): "Relevé de notes fourni",
 ('DemandeDiplome','has_certificat_scolarite'): "Certificat de scolarité fourni",
 ('DemandeDiplome','has_recu_bancaire'): "Reçu bancaire fourni",
 ('DemandeDiplome','admission_etudiant'): "Admission confirmée (NULL = non encore vérifiée)",
 ('DemandeDiplome','commentaire'): "Commentaire libre",
 ('DemandeDiplome','observations'): "Observations / motifs (refus, dossier incomplet...)",
 ('DemandeDiplome','etablissement_origine'): "Établissement d'origine du dossier",
 ('DemandeDiplome','agent_responsable'): "Dernier agent ayant traité la demande",
 ('DemandeDiplome','imprimeur_assigne'): "Imprimeur affecté par le Chef de service",
 ('DemandeDiplome','agent_transmission'): "Agent de transmission chargé du dossier",
 ('DemandeDiplome','date_transmission_chef'): "Date de transmission au Chef de service",
 ('DemandeDiplome','date_impression'): "Date d'impression du diplôme",
 ('DemandeDiplome','date_signature_etablissement'): "Date de signature par le Doyen / Directeur",
 ('DemandeDiplome','date_transmission_president'): "Date de transmission à la Présidence",
 ('DemandeDiplome','date_signature_president'): "Date de signature par le Président",
 ('DemandeDiplome','date_disponibilite'): "Date de mise à disposition au retrait",
 ('DemandeDiplome','date_retrait'): "Date effective de retrait",
 ('DemandeDiplome','nom_retirant'): "Nom de la personne ayant retiré le diplôme",
 ('Historique','demande'): "Demande concernée",
 ('Historique','utilisateur'): "Agent auteur de l'action",
 ('Historique','role_utilisateur'): "Rôle de l'agent au moment de l'action",
 ('Historique','action_realisee'): "Libellé de l'action réalisée",
 ('Historique','ancien_statut'): "Statut avant l'action (liste STATUT_DEMANDE)",
 ('Historique','nouveau_statut'): "Statut après l'action (liste STATUT_DEMANDE)",
 ('Historique','commentaire'): "Commentaire ou motif saisi",
 ('Historique','date_action'): "Date et heure de l'action (automatique)",
 ('Diplome','demande'): "Demande ayant produit le diplôme (relation 1-1)",
 ('Diplome','numero_diplome'): "Numéro officiel, format UT-AAAA-NNNNN",
 ('Diplome','code_verification'): "Code d'authenticité (8 caractères hexadécimaux)",
 ('Diplome','mention'): "Mention obtenue",
 ('Diplome','date_delivrance'): "Date de délivrance (signature Présidence)",
 ('Diplome','date_creation'): "Date de création de l'entrée au registre",
 ('Notification','utilisateur'): "Utilisateur destinataire",
 ('Notification','titre'): "Titre de la notification",
 ('Notification','message'): "Contenu du message",
 ('Notification','type_notification'): "Type (INFO, ALERTE, ...)",
 ('Notification','lu'): "Notification lue",
 ('Notification','date_creation'): "Date de création (automatique)",
 ('JournalActivite','categorie'): "Catégorie de l'entrée (liste CATEGORIE_JOURNAL)",
 ('JournalActivite','operation'): "Opération tracée (liste OPERATION_JOURNAL)",
 ('JournalActivite','auteur'): "Compte ayant effectué l'opération",
 ('JournalActivite','auteur_username'): "Copie de l'identifiant de l'auteur (lisible même si le compte disparaît)",
 ('JournalActivite','cible'): "Compte concerné par l'opération",
 ('JournalActivite','cible_username'): "Copie de l'identifiant du compte concerné",
 ('JournalActivite','adresse_ip'): "Adresse IP (IPv4 ou IPv6) d'origine",
 ('JournalActivite','details'): "Détails complémentaires au format JSON",
 ('JournalActivite','date'): "Date et heure de l'événement (automatique)",
 ('AdresseNotificationEquipe','role'): "Équipe métier concernée (une adresse par équipe)",
 ('AdresseNotificationEquipe','email'): "Adresse e-mail fonctionnelle de l'équipe",
 ('AdresseNotificationEquipe','actif'): "Envoi des e-mails activé",
 ('AdresseNotificationEquipe','modifie_par'): "Dernier administrateur ayant modifié l'adresse",
 ('AdresseNotificationEquipe','date_modification'): "Date de dernière modification (automatique)",
}
LISTS = {  # (model, field) -> nom de liste
 ('Utilisateur','role'): 'ROLE', ('Utilisateur','inscription'): 'INSCRIPTION',
 ('DemandeDiplome','statut'): 'STATUT_DEMANDE', ('JournalActivite','categorie'): 'CATEGORIE_JOURNAL',
 ('JournalActivite','operation'): 'OPERATION_JOURNAL', ('AdresseNotificationEquipe','role'): 'EQUIPE',
}
LIST_DESC = {'ROLE': "Rôles des utilisateurs", 'INSCRIPTION': "États d'inscription d'un compte",
 'STATUT_DEMANDE': "Statuts d'une demande de diplôme (ordre du circuit)",
 'CATEGORIE_JOURNAL': "Catégories du journal d'activité", 'OPERATION_JOURNAL': "Opérations du journal d'activité",
 'EQUIPE': "Équipes métier (adresses de notification)"}

def type_label(f):
    t = f['db_type'].replace(' AUTO_INCREMENT', '').replace(' UNSIGNED', '')
    return {'bool': 'BOOLEAN', 'longtext': 'LONGTEXT', 'json': 'JSON', 'date': 'DATE'}.get(t, t.upper())

def size_label(f):
    return str(f['max_length']) if f['max_length'] else ''

def constraints(m, f):
    c = []
    if f['pk']: c.append('PK')
    if f['rel']: c.append('FK')
    if f['db_type'].endswith('AUTO_INCREMENT'): c.append('AUTO_INC')
    if not f['null']: c.append('NOT NULL')
    if f['unique'] and not f['pk']: c.append('UNIQUE')
    if (f['index'] or f['rel']) and not f['unique']: c.append('INDEX')
    if 'UNSIGNED' in f['db_type']: c.append('UNSIGNED')
    return ', '.join(c)

def remarks(m, f):
    r = []
    if f['rel']:
        r.append(f"Réf. <b>{f['rel']['table']}</b>(id)" + (' [1-1]' if f['rel']['one_to_one'] else ''))
        r.append(f"ON DELETE {f['rel']['on_delete'].replace('_', ' ')}")
    if f['default'] is not None:
        d = f['default']
        d = {'True': 'Vrai', 'False': 'Faux', "''": "'' (vide)"}.get(d, d)
        if d == 'now': d = 'date courante'
        if d == 'None': d = 'NULL'
        if '.' in d and d.split('.')[0][:1].isupper(): d = "'" + d.split('.')[-1] + "'"
        r.append(f'Défaut : {esc(d)}')
    if f['auto_now_add']: r.append('Renseigné à la création')
    if f['auto_now']: r.append('Mis à jour à chaque modification')
    lst = LISTS.get((m['model'], f['name']))
    if lst: r.append(f'Valeurs : liste <b>{lst}</b>')
    return '<br/>'.join(r)

# ---------- Document ----------
class Doc(BaseDocTemplate):
    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph) and fl.style.name in ('h1', 'h2'):
            key = 'k%d' % id(fl)
            self.canv.bookmarkPage(key)
            lvl = 0 if fl.style.name == 'h1' else 1
            self.canv.addOutlineEntry(fl.getPlainText(), key, level=lvl, closed=False)
            self.notify('TOCEntry', (lvl, fl.getPlainText(), self.page, key))

PAGE = landscape(A4)
def deco(c, doc):
    if doc.page == 1: return
    c.saveState()
    w, h = PAGE
    c.setStrokeColor(NAVY); c.setLineWidth(0.6)
    c.line(15*mm, h-12*mm, w-15*mm, h-12*mm); c.line(15*mm, 11*mm, w-15*mm, 11*mm)
    c.setFont('Arial', 8); c.setFillColor(colors.HexColor('#555555'))
    c.drawString(15*mm, h-10*mm, 'Gestion des diplômes — Université')
    c.drawRightString(w-15*mm, h-10*mm, 'Dictionnaire des données')
    c.drawString(15*mm, 7*mm, f"Généré le {datetime.date.today():%d/%m/%Y}")
    c.drawRightString(w-15*mm, 7*mm, f'Page {doc.page}')
    c.restoreState()

doc = Doc(out_path, pagesize=PAGE, leftMargin=15*mm, rightMargin=15*mm, topMargin=16*mm, bottomMargin=15*mm,
          title='Dictionnaire des données — Gestion des diplômes', author='Projet Gestion des diplômes')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate(id='p', frames=[frame], onPage=deco)])
W = doc.width

def grid_table(rows, widths, header_rows=1, zebra=True):
    t = Table(rows, colWidths=widths, repeatRows=header_rows)
    s = [('BACKGROUND', (0, 0), (-1, header_rows-1), NAVY),
         ('GRID', (0, 0), (-1, -1), 0.4, GRID), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
         ('TOPPADDING', (0, 0), (-1, -1), 2.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
         ('LEFTPADDING', (0, 0), (-1, -1), 3), ('RIGHTPADDING', (0, 0), (-1, -1), 3)]
    if zebra:
        for i in range(header_rows, len(rows)):
            if (i - header_rows) % 2: s.append(('BACKGROUND', (0, i), (-1, i), ZEBRA))
    t.setStyle(TableStyle(s))
    return t

P = lambda s, sty=sCell: Paragraph(s, sty)
story = []
models = data['models']

# Page de garde
story += [Spacer(1, 45*mm), Paragraph('DICTIONNAIRE DES DONNÉES', sTitle), Spacer(1, 6*mm),
          Paragraph("Application de gestion des diplômes de l'Université", sSub), Spacer(1, 3*mm),
          Paragraph('Base de données MySQL — Projet M2', sSub), Spacer(1, 25*mm)]
meta = [[P('<b>SGBD</b>', sMeta), P('MySQL (ORM Django)', sMeta)],
        [P('<b>Nombre de tables métier</b>', sMeta), P(str(len(models)), sMeta)],
        [P('<b>Applications</b>', sMeta), P('utilisateurs, demandes, diplomes, notifications, administration', sMeta)],
        [P('<b>Date</b>', sMeta), P(f'{datetime.date.today():%d/%m/%Y}', sMeta)]]
mt = Table(meta, colWidths=[60*mm, 110*mm], hAlign='CENTER')
mt.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.4, GRID), ('BACKGROUND', (0, 0), (0, -1), LIGHT),
                        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
story += [mt, PageBreak()]

# Sommaire
toc = TableOfContents()
toc.levelStyles = [st('toc0', fontName='Arial-Bold', fontSize=10.5, leading=15, leftIndent=0),
                   st('toc1', fontSize=9.5, leading=13, leftIndent=14)]
story += [Paragraph('Sommaire', st('tt', fontName='Arial-Bold', fontSize=15, leading=19, textColor=NAVY, spaceAfter=8)), toc, PageBreak()]

# 1. Présentation
story.append(Paragraph('1. Présentation et conventions', sH1))
story.append(Paragraph(
 "Ce document décrit l'ensemble des tables métier de la base de données de l'application de gestion des diplômes : "
 "pour chaque table, la liste des colonnes avec leur désignation, leur type SQL (MySQL), leur taille, leurs contraintes "
 "et les règles de gestion associées. Il est établi directement à partir des modèles Django, ce qui garantit sa "
 "conformité avec le schéma réellement déployé. Les tables techniques de Django (sessions, permissions, migrations, "
 "content types, etc.) ne sont pas détaillées.", sBody))
story.append(Paragraph('Légende des contraintes', sH2))
leg = [[P('Abréviation', sHead), P('Signification', sHead)]] + [[P(a, sCellB), P(b)] for a, b in [
 ('PK', 'Clé primaire'), ('FK', 'Clé étrangère (référence vers une autre table)'),
 ('AUTO_INC', 'Valeur générée automatiquement par incrémentation'), ('NOT NULL', 'Valeur obligatoire'),
 ('UNIQUE', 'Valeur unique dans la table'), ('INDEX', 'Colonne indexée pour accélérer les recherches'),
 ('UNSIGNED', 'Entier non signé (positif ou nul)'),
 ('ON DELETE CASCADE', 'La ligne est supprimée si la ligne référencée est supprimée'),
 ('ON DELETE SET NULL', 'La référence est mise à NULL si la ligne référencée est supprimée')]]
story.append(grid_table(leg, [40*mm, 140*mm]))

# 2. Liste des tables
story.append(PageBreak())
story.append(Paragraph('2. Liste des tables', sH1))
rows = [[P(h, sHead) for h in ['N°', 'Table (nom physique)', 'Entité', 'Application', 'Nb col.', 'Description']]]
for i, m in enumerate(models, 1):
    rows.append([P(str(i)), P(f"<b>{m['table']}</b>"), P(TABLE_TITLE[m['model']]), P(m['app']),
                 P(str(len(m['fields']))), P(esc(TABLE_DESC[m['model']]))])
story.append(grid_table(rows, [10*mm, 62*mm, 40*mm, 28*mm, 14*mm, W-154*mm]))

# 3. Description détaillée
story.append(PageBreak())
story.append(Paragraph('3. Description détaillée des tables', sH1))
cw = [9*mm, 42*mm, 74*mm, 26*mm, 13*mm, 36*mm, W-200*mm]
for i, m in enumerate(models, 1):
    head = [Paragraph(f"3.{i} {TABLE_TITLE[m['model']]} — {m['table']}", sH2),
            Paragraph(f"<b>Description :</b> {esc(TABLE_DESC[m['model']])}", sBody)]
    rows = [[P(h, sHead) for h in ['N°', 'Colonne', 'Désignation', 'Type', 'Taille', 'Contraintes', 'Règles / Remarques']]]
    for j, f in enumerate(m['fields'], 1):
        desc = D.get((m['model'], f['name'])) or D.get(('*', f['name'])) or f['verbose'].capitalize()
        col = f['column']
        rows.append([P(str(j)), P(f"<b>{col}</b>"), P(esc(desc)), P(type_label(f)), P(size_label(f)),
                     P(constraints(m, f)), P(remarks(m, f))])
    t = grid_table(rows, cw)
    if len(rows) < 14:
        story.append(KeepTogether(head + [t]))
    else:
        story.append(CondPageBreak(70*mm))
        story += head + [t]
    if m['m2m']:
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph("<b>Tables d'association (gérées par Django) :</b> " + '; '.join(
            f"{x['through']} (vers {x['to']})" for x in m['m2m']), sBody))
    story.append(Spacer(1, 5*mm))

# 4. Relations
story.append(PageBreak())
story.append(Paragraph('4. Relations entre les tables', sH1))
rows = [[P(h, sHead) for h in ['Table source', 'Colonne (FK)', 'Table cible', 'Cardinalité', 'Suppression', 'Signification']]]
for m in models:
    for f in m['fields']:
        if f['rel']:
            card = '1 — 1' if f['rel']['one_to_one'] else ('N — 0..1' if f['null'] else 'N — 1')
            rows.append([P(m['table']), P(f"<b>{f['column']}</b>"), P(f['rel']['table']), P(card),
                         P(f['rel']['on_delete'].replace('_', ' ')),
                         P(esc(D.get((m['model'], f['name']), '')))])
story.append(grid_table(rows, [58*mm, 40*mm, 50*mm, 22*mm, 24*mm, W-194*mm]))

# 5. Listes de valeurs
story.append(PageBreak())
story.append(Paragraph('5. Listes de valeurs (domaines)', sH1))
done = set()
for m in models:
    for f in m['fields']:
        lst = LISTS.get((m['model'], f['name']))
        if not lst or lst in done or not f['choices']: continue
        done.add(lst)
        rows = [[P(h, sHead) for h in ['N°', 'Code stocké', 'Libellé']]]
        for k, (code, lib) in enumerate(f['choices'], 1):
            rows.append([P(str(k)), P(f'<b>{esc(code)}</b>'), P(esc(lib))])
        story.append(KeepTogether([Paragraph(f'{lst} — {LIST_DESC[lst]}', sH2),
                                   Paragraph(f"Utilisée par : {m['table']}.{f['column']}", sBody),
                                   grid_table(rows, [10*mm, 80*mm, 100*mm])]))
        story.append(Spacer(1, 4*mm))

doc.multiBuild(story)
print('PDF écrit :', out_path)
