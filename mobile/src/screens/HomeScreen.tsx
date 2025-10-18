import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { loadMessage, saveMessage, clearMessage } from '../storage';

export default function HomeScreen() {
  const [message, setMessage] = useState<string>('');
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const existing = await loadMessage();
      if (existing != null) {
        setMessage(existing);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    try {
      await saveMessage(message);
      Alert.alert('Saved', 'Your message has been saved locally.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save message.');
    }
  };

  const handleClear = async () => {
    try {
      await clearMessage();
      setMessage('');
      Alert.alert('Cleared', 'Stored message has been cleared.');
    } catch (e) {
      Alert.alert('Error', 'Failed to clear message.');
    }
  };

  if (!loaded) {
    return (
      <View style={styles.container}> 
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local Storage Demo</Text>
      <TextInput
        style={styles.input}
        placeholder="Type a message"
        value={message}
        onChangeText={setMessage}
      />
      <View style={styles.buttons}>
        <Button title="Save" onPress={handleSave} />
        <View style={{ width: 12 }} />
        <Button title="Clear" onPress={handleClear} color="#b00020" />
      </View>
      <Text style={styles.hint}>Your message persists across app restarts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttons: {
    marginTop: 16,
    flexDirection: 'row',
  },
  hint: {
    marginTop: 16,
    color: '#666',
  },
});
