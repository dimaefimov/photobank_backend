import React from 'react';

export class UserEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state ={
      "user": this.props.current_user,
      "sent": false,
      "hide_password": true
    }
    this.handleSubmit = this.handleSubmit.bind(this);
    this.hidePassword = this.hidePassword.bind(this);
  }

  handleSubmit(e){
    e.preventDefault();
    let newUser={
      "id":this.refs["id-input"].value,
      "password":this.refs["password-input"].value,
      "email":this.refs["email-input"].value,
      "active":this.refs["active-input"].checked,
      "name":this.refs["name-input"].value,
      "role":this.refs["role-input"].value,
    }
    this.props.userUpdateHandler(newUser);
    this.setState({
      "sent":true
    });
  }

  hidePassword(e){
    e.preventDefault();
    this.setState({
      "hide_password": !this.state.hide_password
    });
  }

  componentDidUpdate(prevProps, prevState){
    if(prevState.sent == true && this.props.user.id != prevProps.user.id){
      this.setState({
        "sent":false
      });
    }
  }

  render() {
    if(this.props.user == null){return (
      <div className="user-editor col s8" key={"user"+0}>
      <h4>Не выбран пользователь</h4>
  </div>
)}
    return(
      <div className="user-editor col s8" key={"user"+this.props.user.id}>
      <h4>{this.props.user.name.length>0?this.props.user.name:"Новый пользователь"}</h4>
      <form onSubmit={this.handleSubmit}>
      <input defaultValue={this.props.user.id} type="hidden" ref="id-input" name="id"></input>
    <label htmlFor="name">Имя пользователя</label>
    <input defaultValue={this.props.user.name} type="text" ref="name-input" name="name"></input>
  <label htmlFor="email">Email</label>
    <input defaultValue={this.props.user.email} type="text" ref="email-input" name="email"></input>
  <p><label><input defaultChecked={this.props.user.active} type="checkbox" ref="active-input" name="active" /><span>Активен</span></label></p>
  <label htmlFor="password">Пароль</label>
    <div className="password-field"><i className={this.state.hide_password?"fas fa-eye":"fas fa-eye-slash"} onClick={this.hidePassword}></i><input defaultValue={this.props.user.password} type={this.state.hide_password?"password":"text"} ref="password-input" name="password"></input></div>
  <label htmlFor="role">Уровень доступа</label>
    <select defaultValue={this.props.user.role} ref="role-input" name="role">
      <option value="3">Пользователь</option>
      <option value="2">Редактор</option>
    <option value="1">Модератор</option>
      </select>
      <button className="blue-grey waves-effect hoverable waves-light btn" type="submit">{this.state.sent?<i className="fas fa-check"></i>:<i class="fas fa-user-check"></i>}Сохранить</button>
      </form>
      </div>
    );
  }
}
