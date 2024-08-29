import React, { useState, useEffect } from 'react';
import { Alert, Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { db, auth } from '../../../firebaseConfig';
import { doc, getDocs, collection } from 'firebase/firestore';

interface CardData {
  id: string;
  firstName: string;
  lastName: string;
  type: 'Student' | 'Work' | 'Personal';
  phone: string;
  workNumber?: string;
}

interface NFCHandlerProps {
  visible: boolean;
  onClose: () => void;
  onCardSelected: (card: CardData) => void;
}

const NFCHandler: React.FC<NFCHandlerProps> = ({ visible, onClose, onCardSelected }) => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      const user = auth.currentUser;
      if (user) {
        const userWalletRef = doc(db, 'wallets', user.uid);
        const cardsRef = collection(userWalletRef, 'cards');
        const cardsSnapshot = await getDocs(cardsRef);
        const userCards = cardsSnapshot.docs.map((doc) => ({
          ...doc.data() as CardData, id: doc.id 
        }));
        setCards(userCards);
      }
    };

    fetchCards();
  }, []);

  useEffect(() => {
    if (visible) {
      startNFC();
    } else {
      stopNFC();
    }
  }, [visible]);

  const startNFC = async () => {
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (tag) {
        Alert.alert('NFC Detected', 'Another phone is nearby. Choose a card to share.');
      }
    } catch (ex) {
      console.warn(ex);
      Alert.alert('Error', 'NFC failed');
    }
  };

  const stopNFC = async () => {
    await NfcManager.cancelTechnologyRequest();
  };

  const writeNfcTag = async (selectedCard: CardData) => {
    try {
      const message = [
        Ndef.textRecord(JSON.stringify(selectedCard)),
      ];
      const bytes = Ndef.encodeMessage(message);

      if (bytes) {
        // Write the NDEF message using transceive
        await NfcManager.transceive(bytes);
        Alert.alert('Success', 'Card information has been written to the NFC tag.');
      } else {
        Alert.alert('Error', 'Failed to encode the NDEF message.');
      }
    } catch (error) {
      console.error('Error writing NFC tag:', error);
      Alert.alert('Error', 'Failed to write the NFC tag.');
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  const handleCardSelection = (card: CardData) => {
    setSelectedCard(card);
  };

  const handleShare = async () => {
    if (selectedCard) {
      await writeNfcTag(selectedCard);
      onCardSelected(selectedCard);
      onClose();
    } else {
      Alert.alert('Error', 'Please select a card to share.');
    }
  };

  return (
    <Modal visible={visible} transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select a Card to Share</Text>
          <FlatList
            data={cards}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.cardItem} onPress={() => handleCardSelection(item)}>
                <Text style={styles.cardText}>{`${item.firstName} ${item.lastName} (${item.type})`}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Selected Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cardItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  cardText: {
    fontSize: 16,
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 20,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'red',
  },
});

export default NFCHandler;
