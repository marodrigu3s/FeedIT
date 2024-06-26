import React, { useState, useRef, useEffect } from 'react';
import {
	StyleSheet,
	Text,
	View,
	SafeAreaView,
	TouchableOpacity,
	Image,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { FontAwesome, Entypo } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStatus } from '../statusContext';
import axios from 'axios';
import CameraLoader from './cameraLoader';
import { getIdPaciente } from '../storage';

const focus = require('../assets/focus.png');

export default function TirarFoto() {
	const navigation = useNavigation();
	const camRef = useRef(null);
	const [facing, setFacing] = useState('back');
	const [permission, requestPermission] = useCameraPermissions();
	const [capturedPhoto, setCapturedPhoto] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const { updateStatus } = useStatus();
	const idPaciente = getIdPaciente();

	useEffect(() => {
		(async () => {
			if (!permission) {
				await requestPermission();
			}
		})();
	}, [permission]);

	if (!permission) {
		return <View />;
	}

	if (!permission.granted) {
		return (
			<View style={styles.container}>
				<Text
					style={{
						textAlign: 'center',
						padding: 10,
						fontFamily: 'Poppins_700Bold',
					}}
				>
					Por favor, precisamos de permissão de acesso a sua câmera
				</Text>
				<TouchableOpacity onPress={requestPermission}>
					<Text style={styles.buttonText}>Conceder Permissão</Text>
				</TouchableOpacity>
			</View>
		);
	}

	async function takePicture() {
		if (camRef.current) {
			const photo = await camRef.current.takePictureAsync({ base64: true });
			setCapturedPhoto(photo.uri);
			await sendString(photo);
		}
	}

async function sendString(photo) {
	setIsLoading(true);
	try {
		const response = await axios.post(
			'https://9c63-2804-14c-bf3a-8061-4976-4c7-486-2363.ngrok-free.app/process-image',
			{
				image_base64: photo.base64,
			}
		);
		console.log('Received from FastAPI:', response.data);

		if (response.data && response.data.status) {
			const updatedData = {
				...response.data.status,
				classificacao: response.data.classification,
			};

			try {
				updateStatus(updatedData);
			} catch (erro) {
				console.error('Erro ao atualizar status:', erro);
			}

			try {
				const idPaciente = getIdPaciente();
				console.log('idPaciente armazenado:', idPaciente);

				const responseStatus = await axios.post(
					'https://9c63-2804-14c-bf3a-8061-4976-4c7-486-2363.ngrok-free.app/save-status',
					{
						idPaciente: idPaciente,
						energia: updatedData.energia,
						forca: updatedData.forca,
						felicidade: updatedData.felicidade,
						alimentacao: updatedData.alimentacao,
						xp: updatedData.xp,
					}
				);

				console.log('Status salvo:', responseStatus.data);
			} catch (error) {
				console.error('Erro ao salvar status:', error);
			}

			try {
				const idPaciente = getIdPaciente();
				let missao1 = 0,
					missao2 = 0,
					missao3 = 0,
					missao4 = 0;

				switch (response.data.classification.toLowerCase()) {
					case 'protein':
					case 'proteins':
						missao1 = 1;
						break;
					case 'carbohydrate':
					case 'carbohydrates':
						missao2 = 1;
						break;
					case 'fruit':
					case 'fruits':
						missao3 = 1;
						break;
					case 'vegetable':
					case 'vegetables':
						missao4 = 1;
						break;
					default:
						console.log('Classificação não reconhecida');
				}

				const responseClassification = await axios.post(
					'https://9c63-2804-14c-bf3a-8061-4976-4c7-486-2363.ngrok-free.app/add-mission',
					{
						idPaciente: idPaciente,
						Missao1: missao1,
						Missao2: missao2,
						Missao3: missao3,
						Missao4: missao4,
					}
				);

				console.log(
					'Missão adicionada com sucesso:',
					responseClassification.data
				);
			} catch (error) {
				console.error('Erro ao adicionar missão:', error);
			}
		}
	} catch (error) {
		console.error('Error sending string:', error);
	} finally {
		setIsLoading(false);
	}
}

	return (
		<SafeAreaView style={styles.container}>
			<CameraLoader visible={isLoading} />
			<CameraView style={{ flex: 1 }} facing={facing} ref={camRef}>
				<View style={{ flex: 1 }}>
					<TouchableOpacity onPress={() => navigation.navigate('Ajuda_foto')}>
						<Entypo
							name="help-with-circle"
							size={30}
							color="white"
							style={styles.help}
						/>
					</TouchableOpacity>
					<Image source={focus} style={styles.focus} />
				</View>
				<View style={styles.buttonContainer}>
					<TouchableOpacity style={styles.button} onPress={takePicture}>
						<FontAwesome name="camera" size={23} color="#fff" />
					</TouchableOpacity>
				</View>
			</CameraView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
	},
	help: {
		marginTop: '10%',
		marginLeft: '85%',
	},
	buttonContainer: {
		flex: 1,
		backgroundColor: 'transparent',
		flexDirection: 'row',
		margin: 20,
		alignSelf: 'center',
	},
	focus: {
		width: 280,
		height: 280,
		alignSelf: 'center',
		marginTop: '30%',
	},
	button: {
		alignSelf: 'flex-end',
		alignItems: 'center',
		backgroundColor: '#121212',
		marginBottom: '20%',
		borderRadius: 40,
		height: 65,
		width: 65,
		justifyContent: 'center',
	},
	buttonText: {
		fontSize: 18,
		color: '#fff',
	},
});
