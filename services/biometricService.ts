
// Utilities for ArrayBuffer <-> Base64 conversion
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
};

export const isBiometricSupported = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  // Check if platform authenticator (TouchID/FaceID/Windows Hello) is available
  return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
};

export const registerBiometric = async (userId: string, userName: string): Promise<boolean> => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "D&M Fire Safety",
        id: window.location.hostname // Must match current domain
      },
      user: {
        id: Uint8Array.from(userId, c => c.charCodeAt(0)),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Forces built-in authenticator (TouchID/FaceID)
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    
    if (credential) {
      // Store the Credential ID mapped to the user ID in localStorage
      // In a real backend app, this would go to the server. Here we trust local device storage.
      const credId = bufferToBase64(credential.rawId);
      localStorage.setItem(`biometric_cred_${userId}`, credId);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Biometric registration failed:", error);
    return false;
  }
};

export const authenticateBiometric = async (userId: string): Promise<boolean> => {
  try {
    const storedCredId = localStorage.getItem(`biometric_cred_${userId}`);
    if (!storedCredId) return false;

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: challenge,
      allowCredentials: [{
        id: base64ToBuffer(storedCredId),
        type: "public-key",
        transports: ["internal"]
      }],
      userVerification: "required",
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
    
    // In a backend app, we would verify the signature here.
    // For a local-first app, successful retrieval from the secure enclave proves user presence/ownership.
    return !!assertion;
  } catch (error) {
    console.error("Biometric authentication failed:", error);
    return false;
  }
};

export const hasBiometricCredential = (userId: string): boolean => {
  return !!localStorage.getItem(`biometric_cred_${userId}`);
};

export const removeBiometricCredential = (userId: string): void => {
  localStorage.removeItem(`biometric_cred_${userId}`);
};
