pipeline {
    agent any

    stages {
        stage('BuildImage') {
            steps {
                sh label: '', script: '''
                docker image build -t friendlyfileserver_rust .
                '''
            }
        }

        stage('SaveImage') {
            steps {
                sh label: '', script: '''
                docker image save friendlyfileserver_rust -o friendlyfileserver_rust.tar
                zip friendlyfileserver_rust.tar.zip friendlyfileserver_rust.tar
                '''
            }
        }

        stage('Deploy') {
            steps {
                checkout changelog: false, poll: false, scm: [$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, extensions: [[$class: 'RelativeTargetDirectory', relativeTargetDir: 'ansible']], submoduleCfg: [], userRemoteConfigs: [[credentialsId: 'github', url: 'https://github.com/mickjohn/deploy_motorsport_calendar.git']]]
                withCredentials(
                    [
                        sshUserPrivateKey(credentialsId: 'mick-idrsa', keyFileVariable: 'SSH_KEY_FILE', passphraseVariable: '', usernameVariable: ''),
                        usernamePassword(credentialsId: 'mick-sudo-pass', passwordVariable: 'BECOME_PASS', usernameVariable: 'BECOME_USER'),
                        usernamePassword(credentialsId: 'ffs_browser_rust', passwordVariable: 'FFS_BROWSER_HASH', usernameVariable: 'FFS_BROWSER_USER'),
                    ]
                ) {
                    sshagent(['mick-idrsa']) {
                        sh label: '', script: '''
                        # Add mickjohn.com to inventory
                        echo "
                        [all]
                        46.101.93.29

                        [all:vars]
                        ansible_ssh_common_args='-C -o ControlMaster=auto -o ControlPersist=1800s'
                        connect_timeout=3000
                        vagrant=False
                        lets_encrypt=True
                        enable_ssl=False
                        domain=www.mickjohn.com
                        email=mickjohnashe@hotmail.com
                        " >> inventory.ini

                        # Remove SSH control masters
                        rm -rf /var/lib/jenkins/.ansible/cp/

                        # Set ffs users json
                        FFS_USERS="{"ffs_users": [{ "username": "${FFS_BROWSER_USER}", "password_hash": "$FFS_BROWSER_HASH"}]}"

                        # Call ansible
                        /usr/local/bin/ansible-playbook \
                            --user mick \
                            -i inventory.ini \
                            -K \
                            --private-key "$SSH_KEY_FILE" \
                            --extra-vars "ansible_become_pass=$BECOME_PASS" \
                            --extra-vars "service_role=friendly_file_server_rust" \
                            --extra-vars "${FFS_USERS}" \
                            ansible/playbooks/main.yml
                        '''
                    }
                }
            }
        }
    }
}