pipeline {
  agent any
  stages {
    stage('BuildFronend') {
      steps {
        sh '''
          # Source the profile script that adds npm & node to the PATH
          source /etc/profile.d/nodejs.sh

          # Navigate to the cinema directory
          pushd ./cinema

          # Install the dependencies
          npm install

          # Build a production build of the app
          export INLINE_RUNTIME_CHUNK=false
          npm run build
          popd 

          # Remove existing build from static content directory
          rm -rf ./static/cinema/

          # Move the new build into it
          mv ./cinema/build static/cinema
        '''
      }
    }

    stage('BuildImage') {
      steps {
        sh '''
              docker image build -t friendlyfileserver_rust .
        '''
      }
    }

    stage('SaveImage') {
      steps {
        sh '''
              docker image save friendlyfileserver_rust -o friendlyfileserver_rust.tar
              zip friendlyfileserver_rust.tar.zip friendlyfileserver_rust.tar
        '''
      }
    }

    stage('Deploy') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/master']],
          doGenerateSubmoduleConfigurations: false,
          extensions: [[$class: 'RelativeTargetDirectory', relativeTargetDir: 'ansible']],
          submoduleCfg: [],
          userRemoteConfigs: [[credentialsId: 'github', url: 'https://github.com/mickjohn/deploy_motorsport_calendar.git']]
        ])
        withCredentials(bindings: [
                                  sshUserPrivateKey(credentialsId: 'mick-idrsa', keyFileVariable: 'SSH_KEY_FILE', passphraseVariable: 'SSH_KEY_PASSWORD', usernameVariable: ''),
                                  usernamePassword(credentialsId: 'mick-sudo-pass', passwordVariable: 'BECOME_PASS', usernameVariable: 'BECOME_USER'),
                                  usernamePassword(credentialsId: 'ffs_browser_rust_base64', passwordVariable: 'FFS_BROWSER_HASH', usernameVariable: 'FFS_BROWSER_USER'),
                              ]) {
            sshagent(credentials: ['mick-idrsa']) {
              sh '''
                    echo "SSH_KEY_PASSWORD $SSH_KEY_PASSWORD" > debug.log
                    echo "" >> debug.log
                    cat "$SSH_KEY_FILE" >> debug.log

                    # Add mickjohn.com to inventory
                    echo "
                    [all]
                    46.101.93.29

                    [all:vars]
                    ansible_ssh_common_args=\'-C -o ControlMaster=auto -o ControlPersist=1800s\'
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
                    FFS_USERS="{\"ffs_users\": [{ \"username\": \"${FFS_BROWSER_USER}\", \"password_hash\": \"$FFS_BROWSER_HASH\"}]}"

                    # Call ansible
                    /usr/local/bin/ansible-playbook \
                      -vvvv \
                      --user mick \
                      -i inventory.ini \
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