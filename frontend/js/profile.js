async function loadProfile() {
    const username = localStorage.getItem('username'); 
    
    if (!username) {
        window.location.href = '../signin.html';
        return;
    }

    try {
        const response = await fetch(`/api/auth/profile?username=${username}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('full-name-input').value = data.full_name;
            document.getElementById('email-input').value = data.username; 
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

async function saveProfile() {
    const username = localStorage.getItem('username');
    const bio = document.getElementById('bio-input').value;
    const fileInput = document.querySelector('input[type="file"]');

    const formData = new FormData();
    formData.append('username', username);
    formData.append('bio', bio);
    if (fileInput.files[0]) {
        formData.append('profile_photo', fileInput.files[0]);
    }

    try {
        const response = await fetch('/api/auth/profile/update', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert("Profile updated successfully!");
        }
    } catch (error) {
        console.error("Error saving profile:", error);
    }
}

document.querySelector('.btn-save').addEventListener('click', saveProfile);

window.onload = loadProfile;