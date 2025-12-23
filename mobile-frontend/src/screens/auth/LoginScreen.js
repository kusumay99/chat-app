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
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { theme } = useTheme();

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
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
              Welcome Back
            </Title>
            <Paragraph style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Sign in to your account
            </Paragraph>
          </View>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.form}>
                <TextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
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
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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

                {errors.general && (
                  <HelperText type="error" visible={true} style={styles.generalError}>
                    {errors.general}
                  </HelperText>
                )}

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
              Don't have an account?{' '}
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              compact
              style={styles.linkButton}
            >
              Sign Up
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
  loginButton: {
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

export default LoginScreen;
