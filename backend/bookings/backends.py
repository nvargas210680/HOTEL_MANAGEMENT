from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # If username wasn't passed in, check the kwargs dictionary as a backup
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
            
        try:
            # Look up the user by the email field
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            return None

        # Check the password safely
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
            
        return None