import React from 'react';

export class UserList extends React.Component {

  constructor(props) {
    super(props);
    this.handleUserChoice = this.handleUserChoice.bind(this);
    this.addUser = this.addUser.bind(this);
  }

  handleUserChoice(e){
    let user_id = e.target.dataset["user"];
    this.props.userChoiceHandler(user_id);
  }

  addUser(){
    this.props.userChoiceHandler();
  }

  render() {
    let users = this.props.users.map((user)=>{
      return <div key={"userl"+user.id} className="user-item" data-user={user.id} onClick={this.handleUserChoice}>{user.name}</div>
    });
    return(
      <div className="user-list col s4">
      <h4>Пользователи</h4>
        {users}
        <button type="button" onClick={this.addUser}>Добавить</button>
      </div>
    );
  }
}