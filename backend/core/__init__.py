# Bypass Django 5.1's database version check for older MariaDB/MySQL versions (e.g. MariaDB 10.4 in XAMPP)
from django.db.backends.base.base import BaseDatabaseWrapper
BaseDatabaseWrapper.check_database_version_supported = lambda self: None

# Disable RETURNING clause feature for MariaDB < 10.5 compatibility in Django 5.1
from django.db.backends.mysql.features import DatabaseFeatures
DatabaseFeatures.can_return_columns_from_insert = property(lambda self: False)
DatabaseFeatures.can_return_rows_from_bulk_insert = property(lambda self: False)
