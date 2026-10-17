from django.db import migrations, models


def backfill_transmissions(apps, schema_editor):
    DemandeDiplome = apps.get_model('demandes', 'DemandeDiplome')
    Historique = apps.get_model('demandes', 'Historique')
    db = schema_editor.connection.alias
    for demande in DemandeDiplome.objects.using(db).filter(
        statut__in=[
            'EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION', 'EN_IMPRESSION', 'IMPRIME',
            'EN_TRANSMISSION_PRESIDENT', 'EN_ATTENTE_SIGNATURE_PRESIDENT',
            'SIGNE_PRESIDENT', 'RETOUR_SCOLARITE',
        ], date_transmission_chef__isnull=True
    ).iterator():
        evenement = Historique.objects.using(db).filter(
            demande_id=demande.pk,
            role_utilisateur='CHEF_SERVICE',
            nouveau_statut__in=['EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION'],
        ).order_by('date_action').first()
        if evenement:
            DemandeDiplome.objects.using(db).filter(pk=demande.pk).update(
                date_transmission_chef=evenement.date_action
            )


class Migration(migrations.Migration):
    dependencies = [
        ('demandes', '0004_demandediplome_admission_etudiant'),
    ]

    operations = [
        migrations.AddField(
            model_name='demandediplome',
            name='date_transmission_chef',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Date de transmission au Chef de service'),
        ),
        migrations.RunPython(backfill_transmissions, migrations.RunPython.noop),
    ]
