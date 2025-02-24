<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Load PHPMailer
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';
require 'PHPMailer/src/Exception.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitize and validate inputs
    $name = htmlspecialchars($_POST['name']);
    $phone = htmlspecialchars($_POST['phone']);
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $package = htmlspecialchars($_POST['package']);
    $date = htmlspecialchars($_POST['date']);
    $message = htmlspecialchars($_POST['message']);

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die("Invalid email format.");
    }

    // Create a new PHPMailer instance
    $mail = new PHPMailer(true);
    
    try {
        // SMTP Configuration
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'your-email@gmail.com';
        $mail->Password   = 'your-app-password';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Email headers
        $mail->setFrom('your-email@gmail.com', 'Collin Xander');
        $mail->addAddress('collinxander1@gmail.com');

        // Email content
        $mail->isHTML(false);
        $mail->Subject = "New Booking Request from $name";
        $mail->Body    = "You have received a new booking request:\n\n" .
                         "Name: $name\n" .
                         "Phone: $phone\n" .
                         "Email: $email\n" .
                         "Selected Package: $package\n" .
                         "Preferred Session Date: $date\n" .
                         "Message/Instructions:\n$message\n";

        // Send the email
        if ($mail->send()) {
            echo "Booking request sent successfully!";
        } else {
            echo "Failed to send booking request.";
        }
    } catch (Exception $e) {
        echo "Mailer Error: " . $mail->ErrorInfo;
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo "Error 405: Method Not Allowed.";
}
?>

