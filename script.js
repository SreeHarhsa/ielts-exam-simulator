// Main JavaScript to control the IELTS Exam Simulator with Gemini AI integration
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const testIntroEl = document.getElementById('test-intro');
    const listeningInstructionsEl = document.getElementById('listening-instructions');
    const listeningTestEl = document.getElementById('listening-test');
    const readingInstructionsEl = document.getElementById('reading-instructions');
    const readingTestEl = document.getElementById('reading-test');
    const writingInstructionsEl = document.getElementById('writing-instructions');
    const writingTestEl = document.getElementById('writing-test');
    const speakingInstructionsEl = document.getElementById('speaking-instructions');
    const speakingTestEl = document.getElementById('speaking-test');
    const testCompleteEl = document.getElementById('test-complete');
    
    const currentSectionDisplay = document.getElementById('current-section-display');
    const sectionTimerEl = document.getElementById('section-timer');
    const mainTimerEl = document.getElementById('main-timer');
    const progressPercentageEl = document.getElementById('progress-percentage');
    
    // Buttons
    const startTestBtn = document.getElementById('start-test-btn');
    const startListeningBtn = document.getElementById('start-listening-btn');
    const startReadingBtn = document.getElementById('start-reading-btn');
    const startWritingBtn = document.getElementById('start-writing-btn');
    const startSpeakingBtn = document.getElementById('start-speaking-btn');
    const endSectionBtn = document.getElementById('end-section-btn');
    const confirmEndSectionBtn = document.getElementById('confirm-end-section-btn');
    const cancelEndSectionBtn = document.getElementById('cancel-end-section-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const evaluateWritingBtn = document.getElementById('evaluate-writing-btn');
    const evaluateSpeakingBtn = document.getElementById('evaluate-speaking-btn');
    
    const geminiModalOverlay = document.getElementById('gemini-modal-overlay');
    const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
    const closeEvaluationBtn = document.getElementById('close-evaluation-btn');
    
    // State management
    let currentSection = 'intro';
    let sectionTimeLeft = 0;
    let sectionTimer;
    let totalTimeLeft = 9900; // 2 hours and 45 minutes in seconds
    let totalTimer;
    
    // Test scores
    let scores = {
        listening: null,
        reading: null,
        writing: null,
        speaking: null,
        overall: null
    };
    
    // User responses
    let userResponses = {
        listening: {},
        reading: {},
        writing: {
            task1: '',
            task2: ''
        },
        speaking: {
            part1: '',
            part2: '',
            part3: ''
        }
    };
    
    // Initialize the application
    function init() {
        bindEvents();
        updateSectionDisplay();
        startTotalTimer();
        updateProgressPercentage(0);
    }
    
    // Bind event listeners
    function bindEvents() {
        startTestBtn.addEventListener('click', startTest);
        startListeningBtn.addEventListener('click', startListeningSection);
        startReadingBtn.addEventListener('click', startReadingSection);
        startWritingBtn.addEventListener('click', startWritingSection);
        startSpeakingBtn.addEventListener('click', startSpeakingSection);
        endSectionBtn.addEventListener('click', showEndSectionConfirmation);
        confirmEndSectionBtn.addEventListener('click', endCurrentSection);
        cancelEndSectionBtn.addEventListener('click', hideEndSectionConfirmation);
        restartBtn.addEventListener('click', restartTest);
        
        // Gemini evaluation
        evaluateWritingBtn.addEventListener('click', evaluateWriting);
        closeEvaluationBtn.addEventListener('click', closeGeminiModal);
        
        // Question navigation in Listening section
        document.getElementById('next-question-btn').addEventListener('click', nextListeningQuestion);
        document.getElementById('prev-question-btn').addEventListener('click', prevListeningQuestion);
        
        // Question navigation in Reading section
        document.getElementById('next-reading-question-btn').addEventListener('click', nextReadingQuestion);
        document.getElementById('prev-reading-question-btn').addEventListener('click', prevReadingQuestion);
        
        // Task navigation in Writing section
        document.getElementById('go-to-task2-btn').addEventListener('click', goToWritingTask2);
        document.getElementById('back-to-task1-btn').addEventListener('click', backToWritingTask1);
        document.getElementById('finish-writing-btn').addEventListener('click', finishWritingSection);
        
        // Add word count functionality to writing tasks
        document.getElementById('task1-editor').addEventListener('input', updateTask1WordCount);
        document.getElementById('task2-editor').addEventListener('input', updateTask2WordCount);
        
        // Speaking section controls
        document.getElementById('start-recording-btn').addEventListener('click', startRecording);
        document.getElementById('stop-recording-btn').addEventListener('click', stopRecording);
        document.getElementById('next-speaking-prompt-btn').addEventListener('click', nextSpeakingPrompt);
        document.getElementById('start-speaking-btn2').addEventListener('click', startSpeakingPart2);
        document.getElementById('next-speaking-part-btn').addEventListener('click', goToSpeakingPart3);
        document.getElementById('finish-speaking-btn').addEventListener('click', finishSpeakingSection);
        document.getElementById('evaluate-speaking-btn').addEventListener('click', () => evaluateSpeaking('part1'));
        document.getElementById('evaluate-speaking-btn2').addEventListener('click', () => evaluateSpeaking('part2'));
        document.getElementById('evaluate-speaking-btn3').addEventListener('click', () => evaluateSpeaking('part3'));
        
        // Handle MCQ options for Listening and Reading
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all siblings
                this.parentElement.querySelectorAll('.option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Store the user's response
                const questionId = this.closest('.question-container').id;
                const section = questionId.startsWith('listening') ? 'listening' : 'reading';
                const questionNumber = questionId.split('-q')[1];
                const selectedOption = this.getAttribute('data-option');
                userResponses[section][questionNumber] = selectedOption;
            });
        });
        
        // Handle True/False options
        document.querySelectorAll('.true-false-option').forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all siblings
                this.parentElement.querySelectorAll('.true-false-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Check the radio button
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Store the user's response
                const questionId = this.closest('.question-container').id;
                const section = questionId.startsWith('listening') ? 'listening' : 'reading';
                const questionNumber = questionId.split('-q')[1];
                const selectedOption = this.getAttribute('data-option');
                userResponses[section][questionNumber] = selectedOption;
            });
        });
        
        // Handle fill-in-the-blank inputs
        document.querySelectorAll('.blank-input').forEach(input => {
            input.addEventListener('input', function() {
                // Store the user's response
                const questionId = this.closest('.question-container').id;
                const section = questionId.startsWith('listening') ? 'listening' : 'reading';
                const questionNumber = questionId.split('-q')[1];
                userResponses[section][questionNumber] = this.value;
            });
        });
        
        // Handle matching select boxes
        document.querySelectorAll('.matching-select').forEach(select => {
            select.addEventListener('change', function() {
                // Store the user's response
                const questionId = this.closest('.question-container').id;
                const section = questionId.startsWith('listening') ? 'listening' : 'reading';
                const questionNumber = questionId.split('-q')[1];
                
                if (!userResponses[section][questionNumber]) {
                    userResponses[section][questionNumber] = {};
                }
                
                const role = this.closest('.matching-item').textContent.trim().split('\n')[0].trim();
                const person = this.value;
                userResponses[section][questionNumber][role] = person;
            });
        });
    }
    
    // Start the test
    function startTest() {
        testIntroEl.classList.add('hidden');
        listeningInstructionsEl.classList.remove('hidden');
        currentSection = 'listening-instructions';
        updateSectionDisplay();
        updateProgressPercentage(5);
    }
    
    // Start the Listening section
    function startListeningSection() {
        listeningInstructionsEl.classList.add('hidden');
        listeningTestEl.classList.remove('hidden');
        currentSection = 'listening-test';
        updateSectionDisplay();
        startSectionTimer(30 * 60); // 30 minutes
        updateProgressPercentage(10);
        
        // Set up the question buttons for Listening section
        setupQuestionButtons(40, 'listening');
        updateCurrentQuestion(1, 'listening');
    }
    
    // Start the Reading section
    function startReadingSection() {
        readingInstructionsEl.classList.add('hidden');
        readingTestEl.classList.remove('hidden');
        currentSection = 'reading-test';
        updateSectionDisplay();
        startSectionTimer(60 * 60); // 60 minutes
        updateProgressPercentage(30);
        
        // Set up the question buttons for Reading section
        setupQuestionButtons(40, 'reading');
        updateCurrentQuestion(1, 'reading');
    }
    
    // Start the Writing section
    function startWritingSection() {
        writingInstructionsEl.classList.add('hidden');
        writingTestEl.classList.remove('hidden');
        currentSection = 'writing-test';
        updateSectionDisplay();
        startSectionTimer(60 * 60); // 60 minutes
        updateProgressPercentage(60);
    }
    
    // Task 1 word count
    function updateTask1WordCount() {
        const text = document.getElementById('task1-editor').value;
        userResponses.writing.task1 = text;
        const wordCount = text.split(/\\s+/).filter(word => word.length > 0).length;
        document.getElementById('task1-word-count').textContent = `Word count: ${wordCount}`;
    }
    
    // Task 2 word count
    function updateTask2WordCount() {
        const text = document.getElementById('task2-editor').value;
        userResponses.writing.task2 = text;
        const wordCount = text.split(/\\s+/).filter(word => word.length > 0).length;
        document.getElementById('task2-word-count').textContent = `Word count: ${wordCount}`;
    }
    
    // Go to Writing Task 2
    function goToWritingTask2() {
        document.getElementById('writing-task1').classList.add('hidden');
        document.getElementById('writing-task2').classList.remove('hidden');
        document.getElementById('go-to-task2-btn').classList.add('hidden');
        document.getElementById('back-to-task1-btn').classList.remove('hidden');
        document.getElementById('finish-writing-btn').classList.remove('hidden');
    }
    
    // Back to Writing Task 1
    function backToWritingTask1() {
        document.getElementById('writing-task2').classList.add('hidden');
        document.getElementById('writing-task1').classList.remove('hidden');
        document.getElementById('back-to-task1-btn').classList.add('hidden');
        document.getElementById('finish-writing-btn').classList.add('hidden');
        document.getElementById('go-to-task2-btn').classList.remove('hidden');
    }
    
    // Finish Writing section
    function finishWritingSection() {
        // Ensure both writing tasks are saved
        userResponses.writing.task1 = document.getElementById('task1-editor').value;
        userResponses.writing.task2 = document.getElementById('task2-editor').value;
        endCurrentSection();
    }
    
    // Start the Speaking section
    function startSpeakingSection() {
        speakingInstructionsEl.classList.add('hidden');
        speakingTestEl.classList.remove('hidden');
        currentSection = 'speaking-test';
        updateSectionDisplay();
        startSectionTimer(14 * 60); // 14 minutes
        updateProgressPercentage(80);
    }
    
    // Start recording (mock functionality)
    function startRecording() {
        document.getElementById('start-recording-btn').classList.add('hidden');
        document.querySelectorAll('.recording-indicator').forEach(el => el.classList.remove('hidden'));
        document.getElementById('stop-recording-btn').classList.remove('hidden');
        
        // In a real application, this would use the browser's audio recording API
        console.log('Recording started...');
        
        // Simulate recording with a timer
        const speakingTimerEl = document.querySelector('.speaking-timer');
        let time = 150; // 2:30 in seconds
        
        const timerInterval = setInterval(() => {
            time--;
            
            if (time <= 0) {
                clearInterval(timerInterval);
                stopRecording();
                return;
            }
            
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            speakingTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
        
        // Store the interval in a data attribute to clear it if user stops early
        speakingTimerEl.dataset.timerInterval = timerInterval;
    }
    
    // Stop recording
    function stopRecording() {
        document.getElementById('stop-recording-btn').classList.add('hidden');
        document.querySelectorAll('.recording-indicator').forEach(el => el.classList.add('hidden'));
        document.getElementById('speaking-response-area').classList.remove('hidden');
        
        // Clear the timer interval if it exists
        const speakingTimerEl = document.querySelector('.speaking-timer');
        if (speakingTimerEl.dataset.timerInterval) {
            clearInterval(speakingTimerEl.dataset.timerInterval);
        }
        
        // In a real application, this would process the recorded audio
        console.log('Recording stopped');
        
        // Simulate speech-to-text by displaying a mock transcript
        const transcript = "In my hometown, which is located in the southeastern part of the country, there are beautiful mountains surrounding the city. What I like most about it is the friendly community and the local cuisine which is famous throughout the region. Over the past decade, it has changed significantly with new infrastructure and shopping centers being built, but the historical center still maintains its charm. I would definitely recommend it as a place to visit, especially during the spring when the festivals take place.";
        document.getElementById('speaking-transcript').value = transcript;
        userResponses.speaking.part1 = transcript;
    }
    
    // Next speaking prompt in Part 1
    function nextSpeakingPrompt() {
        document.getElementById('speaking-part1').classList.add('hidden');
        document.getElementById('speaking-part2').classList.remove('hidden');
        document.getElementById('current-speaking-part').textContent = "2";
        
        // Start preparation timer for Part 2
        let prepTime = 60; // 1 minute in seconds
        const prepTimerEl = document.getElementById('prep-timer');
        
        const prepInterval = setInterval(() => {
            prepTime--;
            
            if (prepTime < 0) {
                clearInterval(prepInterval);
                document.getElementById('preparation-controls').classList.add('hidden');
                document.getElementById('speaking-controls2').classList.remove('hidden');
                startSpeakingPart2();
                return;
            }
            
            const minutes = Math.floor(prepTime / 60);
            const seconds = prepTime % 60;
            prepTimerEl.textContent = `Preparation Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }
    
    // Start speaking in Part 2
    function startSpeakingPart2() {
        document.getElementById('preparation-controls').classList.add('hidden');
        document.getElementById('speaking-controls2').classList.remove('hidden');
        
        // Start speaking timer for Part 2
        let speakingTime = 120; // 2 minutes in seconds
        const speakingTimerEl = document.getElementById('speaking-timer2');
        
        const speakingInterval = setInterval(() => {
            speakingTime--;
            
            if (speakingTime < 0) {
                clearInterval(speakingInterval);
                document.getElementById('speaking-response-area2').classList.remove('hidden');
                
                // Simulate speech-to-text by displaying a mock transcript
                const transcript = "I would like to learn programming in the future. This is a skill that interests me because it would allow me to create my own applications and websites. I plan to learn it through online courses and by practicing regularly with small projects. I want to learn programming because technology is becoming increasingly important in every field, and having this skill would make me more competitive in the job market. In the future, it would benefit me by opening up new career opportunities in the tech industry, allowing me to work remotely, and giving me the ability to bring my ideas to life through software.";
                document.getElementById('speaking-transcript2').value = transcript;
                userResponses.speaking.part2 = transcript;
                return;
            }
            
            const minutes = Math.floor(speakingTime / 60);
            const seconds = speakingTime % 60;
            speakingTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }
    
    // Go to Speaking Part 3
    function goToSpeakingPart3() {
        document.getElementById('speaking-part2').classList.add('hidden');
        document.getElementById('speaking-part3').classList.remove('hidden');
        document.getElementById('current-speaking-part').textContent = "3";
        
        // Add event listeners for part 3 recording
        document.getElementById('start-recording-btn3').addEventListener('click', startRecordingPart3);
        document.getElementById('stop-recording-btn3').addEventListener('click', stopRecordingPart3);
    }
    
    // Start recording for Part 3
    function startRecordingPart3() {
        document.getElementById('start-recording-btn3').classList.add('hidden');
        document.querySelector('#speaking-part3 .recording-indicator').classList.remove('hidden');
        document.getElementById('stop-recording-btn3').classList.remove('hidden');
        
        // Simulate recording with a timer
        const speakingTimerEl = document.querySelector('#speaking-part3 .speaking-timer');
        let time = 240; // 4:00 in seconds
        
        const timerInterval = setInterval(() => {
            time--;
            
            if (time <= 0) {
                clearInterval(timerInterval);
                stopRecordingPart3();
                return;
            }
            
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            speakingTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
        
        // Store the interval in a data attribute to clear it if user stops early
        speakingTimerEl.dataset.timerInterval = timerInterval;
    }
    
    // Stop recording for Part 3
    function stopRecordingPart3() {
        document.getElementById('stop-recording-btn3').classList.add('hidden');
        document.querySelector('#speaking-part3 .recording-indicator').classList.add('hidden');
        document.getElementById('speaking-response-area3').classList.remove('hidden');
        
        // Clear the timer interval if it exists
        const speakingTimerEl = document.querySelector('#speaking-part3 .speaking-timer');
        if (speakingTimerEl.dataset.timerInterval) {
            clearInterval(speakingTimerEl.dataset.timerInterval);
        }
        
        // Simulate speech-to-text by displaying a mock transcript
        const transcript = "I think people are often reluctant to learn new skills because it takes them out of their comfort zone and requires significant time and effort. There's always a fear of failure or looking incompetent while learning something new. Technology has revolutionized skill acquisition by making learning resources more accessible to everyone through online courses, tutorials, and virtual mentors. People can now learn at their own pace and schedule. Yes, many traditional skills like handcrafting, certain agricultural practices, and some traditional arts are being lost in my country as younger generations are more interested in modern technologies and digital skills. I believe schools should strike a balance between practical skills and academic knowledge, as both are essential for success in life. While academic knowledge provides a foundation of understanding, practical skills ensure students can apply what they've learned in real-world situations.";
        document.getElementById('speaking-transcript3').value = transcript;
        userResponses.speaking.part3 = transcript;
    }
    
    // Finish Speaking section
    function finishSpeakingSection() {
        endCurrentSection();
    }
    
    // Navigate to next Listening question
    function nextListeningQuestion() {
        const currentQuestion = parseInt(document.getElementById('current-listening-question').textContent);
        if (currentQuestion < 40) {
            document.getElementById(`listening-q${currentQuestion}`).classList.add('hidden');
            const nextQuestion = currentQuestion + 1;
            
            // In a real application, we would load the next question here
            // For this demo, we just cycle through the 3 sample questions
            const nextQuestionId = `listening-q${(nextQuestion - 1) % 3 + 1}`;
            document.getElementById(nextQuestionId).classList.remove('hidden');
            
            updateCurrentQuestion(nextQuestion, 'listening');
        }
    }
    
    // Navigate to previous Listening question
    function prevListeningQuestion() {
        const currentQuestion = parseInt(document.getElementById('current-listening-question').textContent);
        if (currentQuestion > 1) {
            document.getElementById(`listening-q${currentQuestion % 3 || 3}`).classList.add('hidden');
            const prevQuestion = currentQuestion - 1;
            
            // In a real application, we would load the previous question here
            // For this demo, we just cycle through the 3 sample questions
            const prevQuestionId = `listening-q${(prevQuestion - 1) % 3 + 1}`;
            document.getElementById(prevQuestionId).classList.remove('hidden');
            
            updateCurrentQuestion(prevQuestion, 'listening');
        }
    }
    
    // Navigate to next Reading question
    function nextReadingQuestion() {
        const currentQuestion = parseInt(document.getElementById('current-reading-question').textContent);
        if (currentQuestion < 40) {
            document.getElementById(`reading-q${currentQuestion}`).classList.add('hidden');
            const nextQuestion = currentQuestion + 1;
            
            // In a real application, we would load the next question here
            // For this demo, we just cycle through the 3 sample questions
            const nextQuestionId = `reading-q${(nextQuestion - 1) % 3 + 1}`;
            document.getElementById(nextQuestionId).classList.remove('hidden');
            
            updateCurrentQuestion(nextQuestion, 'reading');
        }
    }
    
    // Navigate to previous Reading question
    function prevReadingQuestion() {
        const currentQuestion = parseInt(document.getElementById('current-reading-question').textContent);
        if (currentQuestion > 1) {
            document.getElementById(`reading-q${currentQuestion}`).classList.add('hidden');
            const prevQuestion = currentQuestion - 1;
            
            // In a real application, we would load the previous question here
            // For this demo, we just cycle through the 3 sample questions
            const prevQuestionId = `reading-q${(prevQuestion - 1) % 3 + 1 || 3}`;
            document.getElementById(prevQuestionId).classList.remove('hidden');
            
            updateCurrentQuestion(prevQuestion, 'reading');
        }
    }
    
    // Update current question display and navigation
    function updateCurrentQuestion(questionNum, section) {
        document.getElementById(`current-${section}-question`).textContent = questionNum;
        
        // Update the question buttons to highlight current question
        document.querySelectorAll('.question-btn').forEach(btn => {
            btn.classList.remove('current');
        });
        
        const currentBtn = document.querySelector(`.question-btn[data-number="${questionNum}"]`);
        if (currentBtn) {
            currentBtn.classList.add('current');
        }
    }
    
    // Set up question buttons for navigation
    function setupQuestionButtons(numQuestions, section) {
        const buttonsContainer = document.getElementById('question-buttons');
        buttonsContainer.innerHTML = '';
        
        for (let i = 1; i <= numQuestions; i++) {
            const button = document.createElement('div');
            button.classList.add('question-btn');
            button.textContent = i;
            button.dataset.number = i;
            
            button.addEventListener('click', function() {
                // In a real application, we would navigate to the specific question
                // For this demo, we just update the current question display
                if (section === 'listening') {
                    document.getElementById(`listening-q${parseInt(document.getElementById('current-listening-question').textContent) % 3 || 3}`).classList.add('hidden');
                    document.getElementById(`listening-q${(i - 1) % 3 + 1}`).classList.remove('hidden');
                    updateCurrentQuestion(i, 'listening');
                } else if (section === 'reading') {
                    document.getElementById(`reading-q${parseInt(document.getElementById('current-reading-question').textContent)}`).classList.add('hidden');
                    document.getElementById(`reading-q${(i - 1) % 3 + 1}`).classList.remove('hidden');
                    updateCurrentQuestion(i, 'reading');
                }
            });
            
            buttonsContainer.appendChild(button);
        }
        
        // Mark the first question as current
        buttonsContainer.querySelector('.question-btn').classList.add('current');
    }
    
    // Show end section confirmation modal
    function showEndSectionConfirmation() {
        confirmModalOverlay.style.display = 'flex';
    }
    
    // Hide end section confirmation modal
    function hideEndSectionConfirmation() {
        confirmModalOverlay.style.display = 'none';
    }
    
    // End the current section and move to the next
    function endCurrentSection() {
        clearInterval(sectionTimer);
        hideEndSectionConfirmation();
        
        // Move to the next section based on the current one
        if (currentSection === 'listening-test') {
            listeningTestEl.classList.add('hidden');
            readingInstructionsEl.classList.remove('hidden');
            currentSection = 'reading-instructions';
            updateProgressPercentage(25);
        } else if (currentSection === 'reading-test') {
            readingTestEl.classList.add('hidden');
            writingInstructionsEl.classList.remove('hidden');
            currentSection = 'writing-instructions';
            updateProgressPercentage(50);
        } else if (currentSection === 'writing-test') {
            writingTestEl.classList.add('hidden');
            speakingInstructionsEl.classList.remove('hidden');
            currentSection = 'speaking-instructions';
            updateProgressPercentage(75);
        } else if (currentSection === 'speaking-test') {
            speakingTestEl.classList.add('hidden');
            testCompleteEl.classList.remove('hidden');
            currentSection = 'test-complete';
            updateProgressPercentage(100);
            
            // Generate mock final scores
            calculateFinalScores();
        }
        
        updateSectionDisplay();
    }
    
    // Calculate final scores
    function calculateFinalScores() {
        // In a real application, these would be calculated based on user responses
        // For this demo, we'll use mock scores
        scores.listening = 6.5;
        scores.reading = 7.0;
        scores.writing = 6.5;
        scores.speaking = 7.5;
        scores.overall = ((scores.listening + scores.reading + scores.writing + scores.speaking) / 4).toFixed(1);
        
        // Update the UI
        document.getElementById('listening-score').textContent = scores.listening;
        document.getElementById('reading-score').textContent = scores.reading;
        document.getElementById('writing-score').textContent = scores.writing;
        document.getElementById('speaking-score').textContent = scores.speaking;
        document.getElementById('overall-score').textContent = scores.overall;
        
        // Generate feedback
        const feedback = `
            <p>You have demonstrated a good command of English across all four skills. Here's a breakdown of your performance:</p>
            <ul>
                <li><strong>Listening (${scores.listening}):</strong> You understood most of the information in the recordings and answered most questions correctly. Work on catching specific details and numbers.</li>
                <li><strong>Reading (${scores.reading}):</strong> Your reading comprehension is strong. You identified main ideas well but could improve on inferring implied meanings.</li>
                <li><strong>Writing (${scores.writing}):</strong> Your writing is coherent and well-structured. Focus on expanding your vocabulary and using more complex sentence structures.</li>
                <li><strong>Speaking (${scores.speaking}):</strong> Your spoken English is fluent and natural with good pronunciation. You could work on elaborating your answers more fully.</li>
            </ul>
            <p>Overall, your score of ${scores.overall} indicates you have a good level of English proficiency suitable for most academic and professional contexts.</p>
            <p>Recommended next steps:</p>
            <ul>
                <li>Focus on expanding your academic vocabulary</li>
                <li>Practice more complex grammatical structures</li>
                <li>Improve note-taking skills for the listening section</li>
                <li>Work on elaborating your ideas more fully in speaking and writing</li>
            </ul>
        `;
        
        document.getElementById('detailed-feedback').innerHTML = feedback;
    }
    
    // Evaluate writing with Gemini AI
    function evaluateWriting() {
        showGeminiModal();
        
        // Get the current writing task
        const currentTask = document.getElementById('current-writing-task').textContent;
        const text = currentTask === "1" ? 
            document.getElementById('task1-editor').value : 
            document.getElementById('task2-editor').value;
            
        // Store the response
        if (currentTask === "1") {
            userResponses.writing.task1 = text;
        } else {
            userResponses.writing.task2 = text;
        }
        
        // Simulate Gemini AI evaluation
        setTimeout(() => {
            document.getElementById('evaluation-spinner').classList.add('hidden');
            document.getElementById('evaluation-results').classList.remove('hidden');
            
            // Set band score
            const taskScore = Math.floor(Math.random() * 3) + 6; // Random score between 6-8
            document.getElementById('modal-band-score').textContent = taskScore.toFixed(1);
            
            // Set criteria scores
            document.getElementById('criterion1-score').textContent = (taskScore + (Math.random() * 1 - 0.5)).toFixed(1);
            document.getElementById('criterion2-score').textContent = (taskScore + (Math.random() * 1 - 0.5)).toFixed(1);
            document.getElementById('criterion3-score').textContent = (taskScore + (Math.random() * 1 - 0.5)).toFixed(1);
            document.getElementById('criterion4-score').textContent = (taskScore + (Math.random() * 1 - 0.5)).toFixed(1);
            
            // Set feedback
            const taskType = currentTask === "1" ? "Task 1 (Graph Description)" : "Task 2 (Essay)";
            const feedbacks = [
                `Your ${taskType} demonstrates a clear understanding of the requirements. You've addressed the main points and provided relevant details.`,
                `Your ideas are generally well-organized with good use of paragraphing and cohesive devices.`,
                `You use a good range of vocabulary with generally accurate spelling, though there's room for more precise academic terms.`,
                `Your grammatical structures are mostly accurate with some good complex sentences, though there are occasional errors with more complex structures.`
            ];
            
            document.getElementById('criterion1-feedback').textContent = feedbacks[0];
            document.getElementById('criterion2-feedback').textContent = feedbacks[1];
            document.getElementById('criterion3-feedback').textContent = feedbacks[2];
            document.getElementById('criterion4-feedback').textContent = feedbacks[3];
            
            // Overall feedback
            document.getElementById('overall-feedback').textContent = `Your ${currentTask === "1" ? "graph description" : "essay"} demonstrates good control of English with clear organization and appropriate detail. There are some minor errors but they don't impede communication.`;
            
            // Improvement suggestions
            const suggestions = [
                `Use a wider range of linking devices to improve cohesion`,
                `Incorporate more specific academic vocabulary`,
                `Develop more complex grammatical structures`,
                `Be more precise with data description and comparisons`,
                `Ensure all aspects of the task are fully developed`
            ];
            
            const suggestionsList = document.getElementById('improvement-suggestions');
            suggestionsList.innerHTML = '';
            
            // Select 3 random suggestions
            const randomSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
            randomSuggestions.forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = suggestion;
                suggestionsList.appendChild(li);
            });
            
            // Update the scores object
            scores.writing = taskScore;
        }, 2000);
    }
    
    // Evaluate speaking with Gemini AI
    function evaluateSpeaking(part) {
        showGeminiModal();
        
        // Get the transcript
        let transcript;
        if (part === 'part1') {
            transcript = document.getElementById('speaking-transcript').value;
            userResponses.speaking.part1 = transcript;
        } else if (part === 'part2') {
            transcript = document.getElementById('speaking-transcript2').value;
            userResponses.speaking.part2 = transcript;
        } else {
            transcript = document.getElementById('speaking-transcript3').value;
            userResponses.speaking.part3 = transcript;
        }
        
        // Simulate Gemini AI evaluation
        setTimeout(() => {
            document.getElementById('evaluation-spinner').classList.add('hidden');
            document.getElementById('evaluation-results').classList.remove('hidden');
            
            // Set band score
            const partScore = Math.floor(Math.random() * 3) + 6; // Random score between 6-8
            document.getElementById('modal-band-score').textContent = partScore.toFixed(1);
            
            // Set criteria scores
            document.getElementById('criterion1-score').textContent = (partScore + (Math.random() * 1 - 0.5)).toFixed(1);
            document.getElementById('criterion2-score').textContent = (partScore + (Math.random() * 1 - 0.5)).toFixed(1);
            document.getElementById('criterion3-score').textContent = (partScore + (Math.random() * 1 - 0.5)).toFixed(1);
            document.getElementById('criterion4-score').textContent = (partScore + (Math.random() * 1 - 0.5)).toFixed(1);
            
            // Set feedback
            const partTitle = part === 'part1' ? "Part 1 (Introduction)" : part === 'part2' ? "Part 2 (Long Turn)" : "Part 3 (Discussion)";
            const feedbacks = [
                `Your responses in ${partTitle} are fluent with only occasional hesitation. You speak at length without noticeable effort.`,
                `You use a range of connectives and discourse markers effectively to organize your ideas.`,
                `You demonstrate a good range of vocabulary appropriate to the topics discussed, with good flexibility in formulation.`,
                `Your pronunciation is clear and natural with good control of stress and intonation patterns.`
            ];
            
            document.getElementById('criterion1-feedback').textContent = feedbacks[0];
            document.getElementById('criterion2-feedback').textContent = feedbacks[1];
            document.getElementById('criterion3-feedback').textContent = feedbacks[2];
            document.getElementById('criterion4-feedback').textContent = feedbacks[3];
            
            // Overall feedback
            document.getElementById('overall-feedback').textContent = `Your speaking in ${partTitle} shows good fluency and coherence with appropriate vocabulary and generally accurate grammar. Your pronunciation is clear and allows for easy understanding.`;
            
            // Improvement suggestions
            const suggestions = [
                `Expand your answers with more examples and details`,
                `Use a wider range of connecting words and phrases`,
                `Pay more attention to verb tense consistency`,
                `Practice more advanced vocabulary related to common IELTS topics`,
                `Work on reducing hesitation when discussing unfamiliar topics`
            ];
            
            const suggestionsList = document.getElementById('improvement-suggestions');
            suggestionsList.innerHTML = '';
            
            // Select 3 random suggestions
            const randomSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
            randomSuggestions.forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = suggestion;
                suggestionsList.appendChild(li);
            });
            
            // Update the scores object
            scores.speaking = partScore;
        }, 2000);
    }
    
    // Show Gemini evaluation modal
    function showGeminiModal() {
        geminiModalOverlay.style.display = 'flex';
        document.getElementById('evaluation-spinner').classList.remove('hidden');
        document.getElementById('evaluation-results').classList.add('hidden');
    }
    
    // Close Gemini evaluation modal
    function closeGeminiModal() {
        geminiModalOverlay.style.display = 'none';
    }
    
    // Restart the test
    function restartTest() {
        // Reset all sections
        testCompleteEl.classList.add('hidden');
        testIntroEl.classList.remove('hidden');
        
        // Reset timers
        clearInterval(sectionTimer);
        clearInterval(totalTimer);
        totalTimeLeft = 9900; // 2 hours and 45 minutes in seconds
        
        currentSection = 'intro';
        updateSectionDisplay();
        startTotalTimer();
        updateProgressPercentage(0);
        
        // Reset form inputs
        document.querySelectorAll('input[type="text"]').forEach(input => {
            input.value = '';
        });
        
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });
        
        document.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });
        
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.value = '';
        });
        
        document.querySelectorAll('.option, .true-false-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Reset word counts
        document.getElementById('task1-word-count').textContent = 'Word count: 0';
        document.getElementById('task2-word-count').textContent = 'Word count: 0';
        
        // Reset writing tasks
        document.getElementById('writing-task1').classList.remove('hidden');
        document.getElementById('writing-task2').classList.add('hidden');
        document.getElementById('go-to-task2-btn').classList.remove('hidden');
        document.getElementById('back-to-task1-btn').classList.add('hidden');
        document.getElementById('finish-writing-btn').classList.add('hidden');
        
        // Reset speaking parts
        document.getElementById('speaking-part1').classList.remove('hidden');
        document.getElementById('speaking-part2').classList.add('hidden');
        document.getElementById('speaking-part3').classList.add('hidden');
        document.getElementById('current-speaking-part').textContent = "1";
        
        // Reset speaking response areas
        document.querySelectorAll('.speaking-response').forEach(area => {
            area.classList.add('hidden');
        });
        
        // Reset recording buttons
        document.getElementById('start-recording-btn').classList.remove('hidden');
        document.getElementById('stop-recording-btn').classList.add('hidden');
        
        // Reset question buttons
        document.getElementById('question-buttons').innerHTML = '';
        
        // Reset user responses
        userResponses = {
            listening: {},
            reading: {},
            writing: {
                task1: '',
                task2: ''
            },
            speaking: {
                part1: '',
                part2: '',
                part3: ''
            }
        };
        
        // Reset scores
        scores = {
            listening: null,
            reading: null,
            writing: null,
            speaking: null,
            overall: null
        };
    }
    
    // Update the current section display
    function updateSectionDisplay() {
        let displayText = 'Introduction';
        
        if (currentSection === 'listening-instructions' || currentSection === 'listening-test') {
            displayText = 'Listening';
        } else if (currentSection === 'reading-instructions' || currentSection === 'reading-test') {
            displayText = 'Reading';
        } else if (currentSection === 'writing-instructions' || currentSection === 'writing-test') {
            displayText = 'Writing';
        } else if (currentSection === 'speaking-instructions' || currentSection === 'speaking-test') {
            displayText = 'Speaking';
        } else if (currentSection === 'test-complete') {
            displayText = 'Test Complete';
        }
        
        currentSectionDisplay.textContent = displayText;
    }
    
    // Start the section timer
    function startSectionTimer(seconds) {
        sectionTimeLeft = seconds;
        updateSectionTimerDisplay();
        
        clearInterval(sectionTimer);
        sectionTimer = setInterval(() => {
            sectionTimeLeft--;
            
            if (sectionTimeLeft < 0) {
                clearInterval(sectionTimer);
                endCurrentSection();
                return;
            }
            
            updateSectionTimerDisplay();
        }, 1000);
    }
    
    // Update the section timer display
    function updateSectionTimerDisplay() {
        const minutes = Math.floor(sectionTimeLeft / 60);
        const seconds = sectionTimeLeft % 60;
        sectionTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Start the total test timer
    function startTotalTimer() {
        updateTotalTimerDisplay();
        
        totalTimer = setInterval(() => {
            totalTimeLeft--;
            
            if (totalTimeLeft < 0) {
                clearInterval(totalTimer);
                
                // In a real test, this would automatically end the test
                // For this demo, we'll just stop the timer
                return;
            }
            
            updateTotalTimerDisplay();
        }, 1000);
    }
    
    // Update the total timer display
    function updateTotalTimerDisplay() {
        const hours = Math.floor(totalTimeLeft / 3600);
        const minutes = Math.floor((totalTimeLeft % 3600) / 60);
        const seconds = totalTimeLeft % 60;
        
        mainTimerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Update progress percentage
    function updateProgressPercentage(percentage) {
        progressPercentageEl.textContent = `${percentage}%`;
    }
    
    // Initialize the application
    init();
    
    // This function would communicate with Gemini API for real evaluation
    // For demonstration purposes, it's simulated with mock responses
    async function evaluateWithGemini(text, type) {
        // In a real implementation, this would make an API call to Gemini
        // For example:
        /*
        const response = await fetch('/api/gemini-evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                type: type
            })
        });
        
        const data = await response.json();
        return data;
        */
        
        // For demo purposes, return a mock response
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    bandScore: (Math.random() * 2 + 6).toFixed(1), // Random score between 6.0 and 8.0
                    criteria: {
                        taskAchievement: (Math.random() * 2 + 6).toFixed(1),
                        coherence: (Math.random() * 2 + 6).toFixed(1),
                        lexicalResource: (Math.random() * 2 + 6).toFixed(1),
                        grammar: (Math.random() * 2 + 6).toFixed(1)
                    },
                    feedback: "This is mock feedback from the Gemini AI evaluation."
                });
            }, 1500);
        });
    }
});