import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const { theme } = useTheme();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password
      );
      if (!result.success) {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Title style={[styles.title, { color: theme.colors.primary }]}>
              Create Account
            </Title>
            <Paragraph style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Join our chat community
            </Paragraph>
          </View>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.form}>
                <TextInput
                  label="Username"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  mode="outlined"
                  autoCapitalize="none"
                  autoComplete="username"
                  error={!!errors.username}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.username}>
                  {errors.username}
                </HelperText>

                <TextInput
                  label="Email Address"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!errors.email}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.email}>
                  {errors.email}
                </HelperText>

                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  error={!!errors.password}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>

                <TextInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  error={!!errors.confirmPassword}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.confirmPassword}>
                  {errors.confirmPassword}
                </HelperText>

                {errors.general && (
                  <HelperText type="error" visible={true} style={styles.generalError}>
                    {errors.general}
                  </HelperText>
                )}

                <Button
                  mode="contained"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
              Already have an account?{' '}
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              compact
              style={styles.linkButton}
            >
              Sign In
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  form: {
    paddingVertical: 10,
  },
  input: {
    marginBottom: 8,
  },
  generalError: {
    textAlign: 'center',
    marginBottom: 16,
  },
  registerButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 16,
  },
  linkButton: {
    marginLeft: -8,
  },
});

export default RegisterScreen;
