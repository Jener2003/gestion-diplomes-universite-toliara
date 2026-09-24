import os
import sys
import django
from django.db import connection

# Set up Django context
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def clear_database():
    print("Connexion à la base de données...")
    with connection.cursor() as cursor:
        # Désactiver les contraintes de clés étrangères temporairement
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        
        # Récupérer la liste des tables
        cursor.execute("SHOW TABLES;")
        tables = [row[0] for row in cursor.fetchall()]
        
        if not tables:
            print("La base de données est déjà complètement vide !")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            return
            
        print(f"Tables trouvées ({len(tables)}) : {', '.join(tables)}")
        for table in tables:
            print(f"Suppression de la table : {table}")
            cursor.execute(f"DROP TABLE IF EXISTS `{table}`;")
            
        # Réactiver les contraintes
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        print("Base de données vidée avec succès !")

if __name__ == "__main__":
    clear_database()
