from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('demandes', '0003_alter_historique_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='demandediplome',
            name='admission_etudiant',
            field=models.BooleanField(blank=True, default=None, null=True, verbose_name="Admission de l'étudiant confirmée"),
        ),
    ]
