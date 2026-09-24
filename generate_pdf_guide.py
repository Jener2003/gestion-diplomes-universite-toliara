import os
import sys
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Canvas avec en-tête et pied de page numéroté automatique"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        if self._pageNumber > 1:
            # Header
            self.drawString(40, 810, "UNIVERSITÉ DE TOLIARA — SYSTÈME INTÉGRÉ DE GESTION DES DIPLÔMES")
            self.drawRightString(555, 810, "GUIDE OFFICIEL DE DÉMONSTRATION (18 FILIÈRES)")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(40, 802, 555, 802)

        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 45, 555, 45)
        
        self.drawString(40, 32, f"Université de Toliara — Soutenance & Démonstration Master 2 — {datetime.now().strftime('%d/%m/%Y')}")
        self.drawRightString(555, 32, f"Page {self._pageNumber} sur {page_count}")
        self.restoreState()


def build_pdf(filename="GUIDE_DEMONSTRATION_GESTION_DIPLOMES.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0a3641")
    secondary_color = colors.HexColor("#0284c7")
    accent_emerald = colors.HexColor("#059669")
    dark_text = colors.HexColor("#0f172a")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color,
        alignment=1,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=secondary_color,
        alignment=1,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=colors.white,
        spaceBefore=0,
        spaceAfter=0
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=primary_color,
        spaceBefore=8,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_text,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=dark_text,
        leftIndent=10,
        spaceAfter=2
    )

    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0369a1")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=dark_text
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.5,
        textColor=primary_color
    )

    elements = []

    # ─────────────────────────────────────────────────────────────────────────
    # EN-TÊTE / BANNIÈRE PRINCIPALE
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("UNIVERSITÉ DE TOLIARA (MADAGASCAR)", ParagraphStyle('UnivHeader', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor("#64748b"), alignment=1, spaceAfter=3)))
    elements.append(Paragraph("GUIDE OFFICIEL DE DÉMONSTRATION DU SYSTÈME", title_style))
    elements.append(Paragraph("Protocole pas-à-pas pour chaque compte utilisateur & Référentiel des 18 Filières", subtitle_style))

    # Box récapitulative des URLs
    url_box_data = [
        [
            Paragraph("<b>Portail Web & Intranet :</b> <font color='#0284c7'>http://localhost:5173</font>", body_style),
            Paragraph("<b>API Django Backend :</b> <font color='#0284c7'>http://localhost:8000</font>", body_style)
        ],
        [
            Paragraph("<b>Authentification :</b> 2FA OTP activée (Code 6 chiffres)", body_style),
            Paragraph("<b>Périmètre Académique :</b> 18 filières habilitées à Toliara", body_style)
        ]
    ]
    url_table = Table(url_box_data, colWidths=[255, 260])
    url_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e0f2fe")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(url_table)
    elements.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 1. TABLEAU DES 18 FILIÈRES DE L'UNIVERSITÉ DE TOLIARA
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("1. RÉFÉRENTIEL ACADÉMIQUE : LES 18 FILIÈRES DE L'UNIVERSITÉ DE TOLIARA", h2_style))
    
    filieres_data = [
        [
            Paragraph("FACULTÉ / INSTITUT", table_header_style),
            Paragraph("N°", table_header_style),
            Paragraph("INTITULÉ DE LA FILIÈRE / SPÉCIALITÉ", table_header_style),
            Paragraph("GRADES DÉLIVRÉS", table_header_style)
        ],
        # Faculté des Sciences
        [
            Paragraph("<b>Faculté des Sciences</b><br/><font color='#64748b'>5 Filières</font>", table_cell_bold),
            Paragraph("1<br/>2<br/>3<br/>4<br/>5", table_cell_style),
            Paragraph("• Mathématiques et Informatique<br/>• Physique et Applications<br/>• Chimie et Applications<br/>• Sciences de la Vie et de l'Environnement<br/>• Sciences de la Terre", table_cell_style),
            Paragraph("Licence, Master, Doctorat", table_cell_style)
        ],
        # FDEGS
        [
            Paragraph("<b>Faculté de Droit, Économie, Gestion & Sociologie (FDEGS)</b><br/><font color='#64748b'>4 Filières</font>", table_cell_bold),
            Paragraph("6<br/>7<br/>8<br/>9", table_cell_style),
            Paragraph("• Droit (Public & Privé)<br/>• Économie<br/>• Gestion et Management<br/>• Sociologie", table_cell_style),
            Paragraph("Licence, Master, Doctorat", table_cell_style)
        ],
        # FLSH
        [
            Paragraph("<b>Faculté des Lettres et Sciences Humaines (FLSH)</b><br/><font color='#64748b'>6 Filières</font>", table_cell_bold),
            Paragraph("10<br/>11<br/>12<br/>13<br/>14<br/>15", table_cell_style),
            Paragraph("• Études Françaises et Francophones<br/>• Études Malgaches<br/>• Études Anglophones<br/>• Histoire et Patrimoine<br/>• Géographie et Aménagement du Territoire<br/>• Philosophie", table_cell_style),
            Paragraph("Licence, Master, Doctorat", table_cell_style)
        ],
        # Médecine
        [
            Paragraph("<b>Faculté de Médecine et Pharmacie</b><br/><font color='#64748b'>2 Filières</font>", table_cell_bold),
            Paragraph("16<br/>17", table_cell_style),
            Paragraph("• Médecine Générale<br/>• Sciences Paramédicales & Maïeutique", table_cell_style),
            Paragraph("Doctorat d'État, Licence/Master", table_cell_style)
        ],
        # IH.SM
        [
            Paragraph("<b>Institut Halieutique et des Sciences Marines (IH.SM)</b><br/><font color='#64748b'>1 Filière d'Excellence</font>", table_cell_bold),
            Paragraph("18", table_cell_style),
            Paragraph("• Sciences Marines et Halieutiques (Océanographie)", table_cell_style),
            Paragraph("Ingénieur, Master, Doctorat", table_cell_style)
        ]
    ]

    t_filieres = Table(filieres_data, colWidths=[150, 20, 245, 100])
    t_filieres.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0891b2")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#ffffff")),
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor("#ffffff")),
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor("#f0fdf4")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_filieres)
    elements.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. TABLEAU RÉCAPITULATIF DES COMPTES
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("2. TABLEAU RÉCAPITULATIF DES COMPTES & IDENTIFIANTS", h2_style))
    
    comptes_data = [
        [
            Paragraph("RÔLE ADMINISTRATIF", table_header_style),
            Paragraph("IDENTIFIANT", table_header_style),
            Paragraph("MOT DE PASSE", table_header_style),
            Paragraph("MISSION DANS LE CIRCUIT OFFICIEL", table_header_style)
        ],
        [
            Paragraph("<b>1. Chef de Service</b><br/><font color='#64748b'>Guichet & Dépôt</font>", table_cell_style),
            Paragraph("<b>chef1</b>", code_style),
            Paragraph("responsable2026", code_style),
            Paragraph("Enregistrement physique des 18 filières, contrôle pièces CIN/quittance, validation initiale ou refus.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Scolarité Centrale</b><br/><font color='#64748b'>Contrôle Académique</font>", table_cell_style),
            Paragraph("<b>scolarite1</b>", code_style),
            Paragraph("password123", code_style),
            Paragraph("Confrontation avec les PV de délibération des 18 filières, contrôle de cursus LMD.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Service Impression</b><br/><font color='#64748b'>Édition Fiduciaire</font>", table_cell_style),
            Paragraph("<b>imprimeur1</b>", code_style),
            Paragraph("password123", code_style),
            Paragraph("Tirage sécurisé, assignation du numéro officiel unique (UT-2026-XXXXX) et du code crypto de sécurité.", table_cell_style)
        ],
        [
            Paragraph("<b>4. Présidence</b><br/><font color='#64748b'>Signature & Sceau</font>", table_cell_style),
            Paragraph("<b>presidence1</b>", code_style),
            Paragraph("password123", code_style),
            Paragraph("Tableau de bord stratégique exécutif (KPIs 18 filières), signature officielle avec Mention, publication au retrait.", table_cell_style)
        ],
        [
            Paragraph("<b>5. Portail Public</b><br/><font color='#64748b'>Tout public (sans login)</font>", table_cell_style),
            Paragraph("<i>Accès Libre</i>", code_style),
            Paragraph("<i>Sans mot de passe</i>", code_style),
            Paragraph("Vérification d'authenticité anti-fraude via code cryptographique, suivi des diplômes disponibles.", table_cell_style)
        ]
    ]

    t_comptes = Table(comptes_data, colWidths=[120, 75, 95, 225])
    t_comptes.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#ffffff")),
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor("#ffffff")),
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor("#f0fdf4")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_comptes)
    elements.append(Spacer(1, 10))

    def make_section_banner(title_text, bg_hex="#0a3641"):
        t = Table([[Paragraph(f"<b>{title_text}</b>", h1_style)]], colWidths=[515])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_hex)),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    # ─────────────────────────────────────────────────────────────────────────
    # SCÉNARIO 1 : CHEF DE SERVICE
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(make_section_banner("SCÉNARIO 1 : COMPTE CHEF DE SERVICE DES DIPLÔMES", "#0369a1"))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>Identifiants :</b> Login = <font color='#0284c7'><b>chef1</b></font> | Mot de passe = <font color='#0284c7'><b>responsable2026</b></font>", body_style))

    chef_steps = [
        ("Étape 1 : Connexion Sécurisée & 2FA", [
            "1. Allez sur <b>http://localhost:5173/login</b>.",
            "2. Cliquez sur <b>« Chef de Service »</b> (ou tapez <code>chef1</code> / <code>responsable2026</code>).",
            "3. Cliquez sur <b>« Continuer »</b> puis validez le code OTP (<code>123456</code>)."
        ]),
        ("Étape 2 : Enregistrer un nouveau dossier (Sélection parmi les 18 filières)", [
            "1. Cliquez sur <b>« Enregistrer un dossier »</b> (<code>/nouvelle-demande</code>).",
            "2. Remplissez le formulaire de test :",
            "   • <b>Matricule :</b> <code>TUL-2026-999</code>",
            "   • <b>Nom :</b> <code>RABE</code> | <b>Prénom :</b> <code>Mamy Nirina</code>",
            "   • <b>Date de naissance :</b> <code>2001-05-15</code> | <b>CIN :</b> <code>501011999888</code>",
            "   • <b>Faculté :</b> Choisissez <i>Faculté des Sciences</i> (ou <i>IH.SM</i>, <i>FDEGS</i>, <i>FLSH</i>, <i>Médecine</i>).",
            "   • <b>Filière (1 des 18 filières de Toliara) :</b> Sélectionnez <i>Mathématiques et Informatique</i>.",
            "   • <b>Niveau d'étude :</b> <i>Master 2</i> | <b>Type de diplôme :</b> <i>Master en Informatique</i>",
            "   • <b>Observations :</b> <i>Dépôt physique complet au guichet avec quittance des droits acquittée.</i>",
            "3. Cliquez sur <b>« Enregistrer le dossier »</b> (toast de succès vert)."
        ]),
        ("Étape 3 : Traiter & Valider le dossier reçu", [
            "1. Dans le tableau de bord, filtrez par statut <b>« Reçues (Chef) »</b>.",
            "2. Cliquez sur <b>« Traiter »</b> sur le dossier de <b>RABE Mamy Nirina</b>.",
            "3. Observez le <b>Stepper</b> et l'<b>Historique</b>.",
            "4. Dans la zone observation, tapez : <i>« Quittance bancaire et pièces d'identité vérifiées et conformes. »</i>",
            "5. Cliquez sur : <b>« Valider & Transmettre à la Scolarité »</b> -> Le statut devient <code>VERIFIEE_CHEF</code>."
        ]),
        ("Étape 4 : Démonstration du Chatbot IA Chef", [
            "1. Ouvrez le <b>Chatbot IA</b> (en bas à droite).",
            "2. Cliquez sur : <b>« Combien de dossiers en attente ? »</b> -> Réponse calculée en temps réel.",
            "3. Déconnectez-vous du compte Chef."
        ])
    ]

    for title, steps in chef_steps:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        for step in steps:
            elements.append(Paragraph(step, bullet_style))

    elements.append(Spacer(1, 6))

    # ─────────────────────────────────────────────────────────────────────────
    # SCÉNARIO 2 : SCOLARITÉ CENTRALE
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(make_section_banner("SCÉNARIO 2 : COMPTE SCOLARITÉ CENTRALE", "#0284c7"))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>Identifiants :</b> Login = <font color='#0284c7'><b>scolarite1</b></font> | Mot de passe = <font color='#0284c7'><b>password123</b></font>", body_style))

    scol_steps = [
        ("Étape 1 : Connexion & 2FA Scolarité", [
            "1. Sur <b>http://localhost:5173/login</b>, connectez-vous avec <code>scolarite1</code> / <code>password123</code>."
        ]),
        ("Étape 2 : Contrôle des Procès-Verbaux (PV) des 18 Filières", [
            "1. Filtrez par statut <b>« Validées Chef »</b>.",
            "2. Sélectionnez le dossier de <b>RABE Mamy Nirina</b> et cliquez sur <b>« Traiter »</b>.",
            "3. Saisissez l'observation : <i>« Contrôle de cursus LMD validé. Conforme au PV de délibération N° 2026-ST-04. »</i>",
            "4. Cliquez sur <b>« Préparer & Transmettre à l'Imprimeur »</b> -> Statut : <code>SCOLARITE_PREPAREE</code>."
        ]),
        ("Étape 3 : Questions Chatbot Scolarité", [
            "1. Ouvrez le Chatbot IA et cliquez sur : <b>« Répartition par faculté »</b>.",
            "2. Observez la répartition multi-établissements des dossiers.",
            "3. Déconnectez-vous."
        ])
    ]

    for title, steps in scol_steps:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        for step in steps:
            elements.append(Paragraph(step, bullet_style))

    elements.append(Spacer(1, 6))

    # ─────────────────────────────────────────────────────────────────────────
    # SCÉNARIO 3 : SERVICE IMPRESSION
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(make_section_banner("SCÉNARIO 3 : COMPTE SERVICE IMPRESSION (IMPRIMEUR)", "#0891b2"))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>Identifiants :</b> Login = <font color='#0284c7'><b>imprimeur1</b></font> | Mot de passe = <font color='#0284c7'><b>password123</b></font>", body_style))

    imp_steps = [
        ("Étape 1 : Connexion & 2FA Imprimeur", [
            "1. Connectez-vous avec <code>imprimeur1</code> / <code>password123</code>."
        ]),
        ("Étape 2 : Lancement du Tirage & Attribution des Clés de Sécurité", [
            "1. Filtrez par statut <b>« Préparées Scolarité »</b> et cliquez sur <b>« Traiter »</b>.",
            "2. Saisissez : <i>« Tirage fiduciaire exécuté sur papier sécurisé à filigrane réf. FIL-2026-A. »</i>",
            "3. Cliquez sur <b>« Confirmer l'Impression »</b>.",
            "4. Le bloc <b>« Registre du diplôme »</b> s'affiche avec le N° officiel (<code>UT-2026-XXXXX</code>) et le code crypto (ex: <code>8 caractères hexadécimaux</code>). Notez ce code !",
            "5. Déconnectez-vous."
        ])
    ]

    for title, steps in imp_steps:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        for step in steps:
            elements.append(Paragraph(step, bullet_style))

    elements.append(Spacer(1, 6))

    # ─────────────────────────────────────────────────────────────────────────
    # SCÉNARIO 4 : PRÉSIDENCE DE L'UNIVERSITÉ
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(make_section_banner("SCÉNARIO 4 : COMPTE PRÉSIDENCE DE L'UNIVERSITÉ", "#059669"))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>Identifiants :</b> Login = <font color='#0284c7'><b>presidence1</b></font> | Mot de passe = <font color='#0284c7'><b>password123</b></font>", body_style))

    pres_steps = [
        ("Étape 1 : Connexion & Analyse Stratégique (KPIs)", [
            "1. Connectez-vous avec <code>presidence1</code> / <code>password123</code>.",
            "2. Montrez le <b>délai moyen de délivrance</b> et les graphiques de diplomation par faculté.",
            "3. Testez les boutons <b>« Exporter Excel »</b> et <b>« Exporter PDF »</b>."
        ]),
        ("Étape 2 : Signature Officielle, Mention & Publication", [
            "1. Filtrez par statut <b>« Imprimées »</b> et cliquez sur <b>« Traiter »</b>.",
            "2. Sélectionnez la Mention (ex: <b>« Très Bien »</b>).",
            "3. Saisissez : <i>« Vu le PV de délibération, diplôme revêtu du grand sceau et signé ce jour. »</i>",
            "4. Cliquez sur <b>« Signer le Diplôme »</b> (<code>SIGNEE</code>) puis <b>« Marquer Disponible au Retrait (Public) »</b> (<code>DISPONIBLE</code>).",
            "5. Déconnectez-vous."
        ])
    ]

    for title, steps in pres_steps:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        for step in steps:
            elements.append(Paragraph(step, bullet_style))

    elements.append(Spacer(1, 6))

    # ─────────────────────────────────────────────────────────────────────────
    # SCÉNARIO 5 : PORTAIL PUBLIC & VÉRIFICATION ANTI-FRAUDE
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(make_section_banner("SCÉNARIO 5 : PORTAIL PUBLIC & VÉRIFICATION ANTI-FRAUDE (SANS LOGIN)", "#475569"))
    elements.append(Spacer(1, 4))

    pub_steps = [
        ("Étape 1 : Vérification de Disponibilité au Retrait", [
            "1. Retournez sur <b>http://localhost:5173/</b>.",
            "2. Dans la recherche des diplômes disponibles, tapez le matricule <code>TUL-2026-999</code> ou le nom <code>RABE</code>.",
            "3. Le système confirme la disponibilité immédiate du diplôme au guichet central."
        ]),
        ("Étape 2 : Authentification Anti-Fraude du Diplôme", [
            "1. Saisissez le <b>Code de vérification</b> généré par l'imprimeur (ou le N° de diplôme).",
            "2. Cliquez sur <b>« Vérifier l'authenticité »</b>.",
            "3. <b>Climax de la démonstration :</b> Le Certificat Officiel infalsifiable s'affiche avec la mention <i>Très Bien</i>, la date, le sceau numérique et la garantie officielle de l'Université de Toliara."
        ])
    ]

    for title, steps in pub_steps:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        for step in steps:
            elements.append(Paragraph(step, bullet_style))

    elements.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────────────────
    # CONSEILS POUR LA SOUTENANCE
    # ─────────────────────────────────────────────────────────────────────────
    elements.append(make_section_banner("CONSEILS CLÉS POUR RÉUSSIR VOTRE SOUTENANCE", "#0f172a"))
    elements.append(Spacer(1, 4))

    reco_data = [
        [
            Paragraph("<b>Ordre Chronologique</b>", table_cell_bold),
            Paragraph("<b>1. Public</b> (Accueil) → <b>2. Chef</b> (Dépôt guichet) → <b>3. Scolarité</b> (PV LMD) → <b>4. Imprimeur</b> (Sécurité & N°) → <b>5. Présidence</b> (Signature & KPIs) → <b>6. Public</b> (Authentification).", table_cell_style)
        ],
        [
            Paragraph("<b>5 Points Forts</b>", table_cell_bold),
            Paragraph("• <b>Sécurité RBAC stricte</b> | • <b>2FA OTP</b> | • <b>Audit Trail horodaté</b> | • <b>Anti-Fraude crypto</b> | • <b>Chatbot IA métier sécurisé</b>", table_cell_style)
        ]
    ]

    t_reco = Table(reco_data, colWidths=[120, 395])
    t_reco.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_reco)

    # Build the document
    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: PDF guide généré avec succès -> {filename}")

if __name__ == "__main__":
    output_pdf = sys.argv[1] if len(sys.argv) > 1 else "GUIDE_DEMONSTRATION_GESTION_DIPLOMES.pdf"
    build_pdf(output_pdf)
